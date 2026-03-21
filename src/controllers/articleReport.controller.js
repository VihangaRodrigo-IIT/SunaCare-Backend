import { Article, ArticleReport, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const REPORTER_ATTRS = ['id', 'name', 'email'];
const ARTICLE_AUTHOR_ATTRS = ['id', 'name', 'email', 'role', 'is_active'];
const REVIEWER_ATTRS = ['id', 'name', 'email'];

// POST /api/articles/:id/report (optional auth)
export const createArticleReport = asyncHandler(async (req, res) => {
  const articleId = Number.parseInt(String(req.params.id), 10);
  if (!Number.isFinite(articleId)) {
    return res.status(400).json({ success: false, message: 'Invalid article id' });
  }

  const article = await Article.findByPk(articleId);
  if (!article) {
    return res.status(404).json({ success: false, message: 'Article not found' });
  }

  const reason = String(req.body.reason || '').trim();
  if (!reason) {
    return res.status(400).json({ success: false, message: 'Reason is required' });
  }

  const details = String(req.body.details || '').trim();
  const reporter_name = String(req.body.reporter_name || '').trim();
  const reporter_email = String(req.body.reporter_email || '').trim();

  const report = await ArticleReport.create({
    article_id: article.id,
    reported_by: req.user?.id || null,
    reason,
    details: details || null,
    reporter_name: reporter_name || req.user?.name || null,
    reporter_email: reporter_email || req.user?.email || null,
  });

  res.status(201).json({
    success: true,
    report: {
      id: report.id,
      status: report.status,
    },
  });
});

// GET /api/articles/reports/all?status=pending (admin)
export const listArticleReports = asyncHandler(async (req, res) => {
  const where = {};
  const status = String(req.query.status || '').trim();
  if (status) where.status = status;

  const reports = await ArticleReport.findAll({
    where,
    include: [
      {
        model: Article,
        as: 'article',
        include: [{ model: User, as: 'author', attributes: ARTICLE_AUTHOR_ATTRS }],
      },
      { model: User, as: 'reporter', attributes: REPORTER_ATTRS, required: false },
      { model: User, as: 'reviewer', attributes: REVIEWER_ATTRS, required: false },
    ],
    order: [['created_at', 'DESC']],
  });

  res.json({ success: true, reports });
});

// PATCH /api/articles/reports/:reportId/review (admin)
// body: { action: 'dismiss' | 'remove_article' | 'revoke_author', admin_note?: string }
export const reviewArticleReport = asyncHandler(async (req, res) => {
  const reportId = Number.parseInt(String(req.params.reportId), 10);
  if (!Number.isFinite(reportId)) {
    return res.status(400).json({ success: false, message: 'Invalid report id' });
  }

  const action = String(req.body.action || '').trim();
  if (!['dismiss', 'remove_article', 'revoke_author'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  const report = await ArticleReport.findByPk(reportId, {
    include: [{ model: Article, as: 'article' }],
  });

  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  const article = report.article;

  if (action === 'remove_article' && article) {
    await article.destroy();
  }

  if (action === 'revoke_author' && article) {
    const author = await User.findByPk(article.author_id);
    if (author && author.role !== 'admin') {
      await author.update({ is_active: false });
    }
    await article.update({ status: 'draft' });
  }

  await report.update({
    status: action === 'dismiss' ? 'dismissed' : 'reviewed',
    action_taken: action,
    admin_note: req.body.admin_note ? String(req.body.admin_note) : null,
    reviewed_by: req.user?.id || null,
    reviewed_at: new Date(),
  });

  const updated = await ArticleReport.findByPk(report.id, {
    include: [
      {
        model: Article,
        as: 'article',
        include: [{ model: User, as: 'author', attributes: ARTICLE_AUTHOR_ATTRS }],
      },
      { model: User, as: 'reporter', attributes: REPORTER_ATTRS, required: false },
      { model: User, as: 'reviewer', attributes: REVIEWER_ATTRS, required: false },
    ],
  });

  res.json({ success: true, report: updated });
});
