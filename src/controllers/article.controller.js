import { Article, ArticleView, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const AUTHOR_ATTRS = ['id', 'name', 'role', 'avatar'];

function normalizeTags(tags) {
	if (!tags) return [];
	if (Array.isArray(tags)) return tags.filter(Boolean);
	if (typeof tags === 'string') {
		try {
			const parsed = JSON.parse(tags);
			return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
		} catch {
			return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
		}
	}
	return [];
}

function normalizeStatus(status) {
	return status === 'published' ? 'published' : 'draft';
}

function parseInteger(value) {
	if (value === undefined || value === null || value === '') return null;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDisplayAuthorName(value) {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed || null;
}

function articleToResponse(article) {
	const data = article.toJSON ? article.toJSON() : article;
	return {
		...data,
		author_name: data.display_author_name || data.author?.name || null,
		author_role: data.author?.role || null,
	};
}

function buildArticlePayload(req, existingArticle) {
	const nextStatus = normalizeStatus(req.body.status ?? existingArticle?.status);
	const payload = {};

	if (req.body.title !== undefined) payload.title = req.body.title;
	if (req.body.summary !== undefined) payload.summary = req.body.summary;
	if (req.body.content !== undefined) payload.content = req.body.content;
	if (req.body.category !== undefined) payload.category = req.body.category;
	if (req.body.tags !== undefined) payload.tags = normalizeTags(req.body.tags);
	if (req.body.read_time_min !== undefined) payload.read_time_min = parseInteger(req.body.read_time_min);
	if (req.body.display_author_name !== undefined) {
		payload.display_author_name = normalizeDisplayAuthorName(req.body.display_author_name);
	}
	if (req.body.status !== undefined || !existingArticle) payload.status = nextStatus;

	if (req.file) {
		payload.cover_url = `/uploads/articles/${req.file.filename}`;
	} else if (req.body.remove_cover === 'true') {
		payload.cover_url = null;
	} else if (req.body.cover_url !== undefined) {
		payload.cover_url = req.body.cover_url || null;
	}

	if (nextStatus === 'published' && existingArticle?.status !== 'published') {
		payload.published_at = new Date();
	}

	if (nextStatus !== 'published' && existingArticle?.status === 'published' && req.body.status !== undefined) {
		payload.published_at = null;
	}

	return payload;
}

// GET /api/articles  (public — published only)
export const listArticles = asyncHandler(async (req, res) => {
	const where = { status: 'published' };
	if (req.query.category) where.category = req.query.category;

	const articles = await Article.findAll({
		where,
		include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRS }],
		attributes: { exclude: ['content'] },  // exclude heavy content from list
		order: [['published_at', 'DESC']],
	});

	res.json({ success: true, articles: articles.map(articleToResponse) });
});

// GET /api/articles/all  (responder+ — includes drafts)
export const listAllArticles = asyncHandler(async (req, res) => {
	const where = {};
	if (req.query.status)   where.status   = req.query.status;
	if (req.query.category) where.category = req.query.category;

	// Responders only see their own drafts + all published
	if (req.user.role === 'responder') {
		const { Op } = await import('sequelize');
		where[Op.or] = [
			{ status: 'published' },
			{ status: 'draft', author_id: req.user.id },
		];
	}

	const articles = await Article.findAll({
		where,
		include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRS }],
		order: [['created_at', 'DESC']],
	});

	res.json({ success: true, articles: articles.map(articleToResponse) });
});

// GET /api/articles/:id  (public — increments view_count)
export const getArticle = asyncHandler(async (req, res) => {
	const article = await Article.findByPk(req.params.id, {
		include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRS }],
	});
	if (!article) return res.status(404).json({ success: false, message: 'Article not found' });
	if (article.status !== 'published' && req.user?.role !== 'admin' && req.user?.id !== article.author_id) {
		return res.status(404).json({ success: false, message: 'Article not found' });
	}

	// Record view
	await ArticleView.create({
		article_id: article.id,
		user_id: req.user?.id || null,
		ip_address: req.ip,
	});
	await article.increment('view_count');

	res.json({ success: true, article: articleToResponse(article) });
});

// POST /api/articles  (responder+)
export const createArticle = asyncHandler(async (req, res) => {
	const payload = buildArticlePayload(req);
	const article = await Article.create({
		...payload,
		author_id: req.user.id,
		published_at: payload.status === 'published' ? new Date() : null,
	});

	const created = await Article.findByPk(article.id, {
		include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRS }],
	});

	res.status(201).json({ success: true, article: articleToResponse(created) });
});

// PUT /api/articles/:id  (responder+ own, admin any)
export const updateArticle = asyncHandler(async (req, res) => {
	const article = await Article.findByPk(req.params.id);
	if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

	if (req.user.role !== 'admin' && article.author_id !== req.user.id) {
		return res.status(403).json({ success: false, message: 'Not authorised' });
	}

	const updates = buildArticlePayload(req, article);

	await article.update(updates);

	const updated = await Article.findByPk(article.id, {
		include: [{ model: User, as: 'author', attributes: AUTHOR_ATTRS }],
	});

	res.json({ success: true, article: articleToResponse(updated) });
});

// DELETE /api/articles/:id  (responder+ own, admin any)
export const deleteArticle = asyncHandler(async (req, res) => {
	const article = await Article.findByPk(req.params.id);
	if (!article) return res.status(404).json({ success: false, message: 'Article not found' });

	if (req.user.role !== 'admin' && article.author_id !== req.user.id) {
		return res.status(403).json({ success: false, message: 'Not authorised' });
	}

	await article.destroy();
	res.json({ success: true, message: 'Article deleted' });
});
