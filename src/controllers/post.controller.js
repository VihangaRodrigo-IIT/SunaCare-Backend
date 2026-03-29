import { Post, PostComment, PostCommentLike, PostCommentReport, PostLike, User } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { sequelize } from '../config/database.js';

const MODERATOR_ROLES = new Set(['admin', 'responder']);
const SYSTEM_ONLY_POST_TYPES = new Set(['urgent_rescue_update', 'lost_pet']);
let cachedPostAuthorAttrs = null;

async function getPostAuthorAttrs() {
  if (cachedPostAuthorAttrs) return cachedPostAuthorAttrs;

  try {
    const [rows] = await sequelize.query('SHOW COLUMNS FROM users');
    const cols = new Set(rows.map((row) => row.Field));
    const attrs = ['id', 'name', 'role', 'avatar'];
    if (cols.has('org_name')) attrs.splice(3, 0, 'org_name');
    cachedPostAuthorAttrs = attrs.filter((attr) => cols.has(attr));
  } catch {
    cachedPostAuthorAttrs = ['id', 'name', 'role', 'avatar'];
  }

  return cachedPostAuthorAttrs;
}

function isModerator(user) {
  return Boolean(user && MODERATOR_ROLES.has(user.role));
}

function parseImageUrls(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((value) => String(value || '').trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((value) => String(value || '').trim()).filter(Boolean);
        }
      } catch {
        return [];
      }
    }
    return [trimmed];
  }
  return [];
}

function getUploadedPostImageUrls(req) {
  const files = req.files;
  if (!files) return [];

  let uploaded = [];
  if (Array.isArray(files)) {
    uploaded = files;
  } else {
    const single = Array.isArray(files.image) ? files.image : [];
    const multiple = Array.isArray(files.images) ? files.images : [];
    uploaded = [...single, ...multiple];
  }

  return uploaded
    .map((file) => (file?.filename ? `/uploads/posts/${file.filename}` : null))
    .filter(Boolean);
}

function mergeImageUrls(existing, bodyImageUrls, bodyImageUrl, uploadedImageUrls) {
  const hasExplicitBodyImages = bodyImageUrls !== undefined || bodyImageUrl !== undefined;
  const base = hasExplicitBodyImages ? [] : parseImageUrls(existing);
  const fromBodyList = bodyImageUrls !== undefined ? parseImageUrls(bodyImageUrls) : [];
  const fromBodySingle = bodyImageUrl !== undefined ? parseImageUrls(bodyImageUrl) : [];
  const merged = [...base, ...fromBodyList, ...fromBodySingle, ...uploadedImageUrls];
  return Array.from(new Set(merged));
}

function normalizeCommentPayload(comment, includeReports) {
  const obj = typeof comment?.toJSON === 'function' ? comment.toJSON() : comment;
  const reports = Array.isArray(obj?.reports) ? obj.reports : [];
  const commentLikes = Array.isArray(obj?.comment_likes) ? obj.comment_likes : [];
  const latestReport = reports.length
    ? reports.slice().sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0]
    : null;

  const payload = {
    ...obj,
    parent_comment_id: obj?.parent_comment_id ? Number(obj.parent_comment_id) : null,
    author_name: obj?.author?.name,
    author_avatar: obj?.author?.avatar,
    likes: Number(obj?.likes ?? commentLikes.length ?? 0),
    liked_by_me: commentLikes.length > 0,
    reported: Boolean(obj?.is_flagged),
    hidden: Boolean(obj?.hidden),
    report_count: Number(obj?.flag_count ?? reports.length ?? 0),
    latest_report_reason: latestReport?.reason || null,
  };

  if (!includeReports) delete payload.reports;
  delete payload.comment_likes;
  return payload;
}

function normalizePostPayload(post, user) {
  const obj = post.toJSON();
  const includeReports = isModerator(user);
  const imageUrls = Array.from(new Set([...parseImageUrls(obj.image_urls), ...parseImageUrls(obj.image_url)]));
  const comments = Array.isArray(obj.comments)
    ? obj.comments.map((comment) => normalizeCommentPayload(comment, includeReports))
    : [];
  const visibleComments = includeReports ? comments : comments.filter((comment) => !comment.hidden);
  const likedByMe = Array.isArray(obj.post_likes) ? obj.post_likes.length > 0 : false;

  const payload = {
    ...obj,
    image_urls: imageUrls,
    image_url: imageUrls[0] || null,
    comments: visibleComments,
    comment_count: visibleComments.length,
    liked_by_me: likedByMe,
    author_name: obj.author?.name,
    author_role: obj.author?.role,
    author_org: obj.author?.org_name,
    author_avatar: obj.author?.avatar,
  };

  delete payload.post_likes;
  return payload;
}

export const getPosts = asyncHandler(async (req, res) => {
  const where = {};
  const authorAttrs = await getPostAuthorAttrs();

  if (req.query.flagged === '1') where.is_flagged = true;

  const include = [
    { model: User, as: 'author', attributes: authorAttrs },
    {
      model: PostComment,
      as: 'comments',
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'avatar'] },
        {
          model: PostCommentLike,
          as: 'comment_likes',
          attributes: ['id', 'user_id'],
          where: req.user?.id ? { user_id: req.user.id } : undefined,
          required: false,
        },
        {
          model: PostCommentReport,
          as: 'reports',
          required: false,
          include: [{ model: User, as: 'reporter', attributes: ['id', 'name'] }],
        },
      ],
    },
  ];

  if (req.user?.id) {
    include.push({
      model: PostLike,
      as: 'post_likes',
      attributes: ['id', 'user_id'],
      where: { user_id: req.user.id },
      required: false,
    });
  }

  const posts = await Post.findAll({
    where,
    include,
    order: [['createdAt', 'DESC']],
  });

  const result = posts.map((post) => normalizePostPayload(post, req.user));
  res.status(200).json({ success: true, count: result.length, data: result });
});

export const getPostById = asyncHandler(async (req, res) => {
  const authorAttrs = await getPostAuthorAttrs();
  const include = [
    { model: User, as: 'author', attributes: authorAttrs },
    {
      model: PostComment,
      as: 'comments',
      include: [
        { model: User, as: 'author', attributes: ['id', 'name', 'avatar'] },
        {
          model: PostCommentLike,
          as: 'comment_likes',
          attributes: ['id', 'user_id'],
          where: req.user?.id ? { user_id: req.user.id } : undefined,
          required: false,
        },
        {
          model: PostCommentReport,
          as: 'reports',
          required: false,
          include: [{ model: User, as: 'reporter', attributes: ['id', 'name'] }],
        },
      ],
    },
  ];

  if (req.user?.id) {
    include.push({
      model: PostLike,
      as: 'post_likes',
      attributes: ['id', 'user_id'],
      where: { user_id: req.user.id },
      required: false,
    });
  }

  const post = await Post.findByPk(req.params.id, { include });
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  res.status(200).json({ success: true, data: normalizePostPayload(post, req.user) });
});

export const getPostComments = asyncHandler(async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  const comments = await PostComment.findAll({
    where: { post_id: post.id },
    include: [
      { model: User, as: 'author', attributes: ['id', 'name', 'avatar'] },
      {
        model: PostCommentLike,
        as: 'comment_likes',
        attributes: ['id', 'user_id'],
        where: req.user?.id ? { user_id: req.user.id } : undefined,
        required: false,
      },
      {
        model: PostCommentReport,
        as: 'reports',
        required: false,
        include: [{ model: User, as: 'reporter', attributes: ['id', 'name'] }],
      },
    ],
    order: [['created_at', 'DESC']],
  });

  const includeReports = isModerator(req.user);
  const normalized = comments.map((comment) => normalizeCommentPayload(comment, includeReports));
  const visible = includeReports ? normalized : normalized.filter((comment) => !comment.hidden);

  res.status(200).json({ success: true, data: { comments: visible } });
});

export const getMyPosts = asyncHandler(async (req, res) => {
  const posts = await Post.findAll({
    where: { author_id: req.user.id },
    include: [{ model: PostComment, as: 'comments', attributes: ['id', 'hidden'] }],
    order: [['createdAt', 'DESC']],
  });

  const result = posts.map((post) => {
    const obj = post.toJSON();
    const comments = Array.isArray(obj.comments) ? obj.comments.filter((comment) => !comment.hidden) : [];
    obj.comment_count = comments.length;
    return obj;
  });

  res.status(200).json({ success: true, count: result.length, data: result });
});

export const createPost = asyncHandler(async (req, res) => {
  const { title, body, image_url, post_type } = req.body;
  const normalizedPostType = typeof post_type === 'string' ? post_type.trim().toLowerCase() : '';

  if (req.user?.role === 'responder' && SYSTEM_ONLY_POST_TYPES.has(normalizedPostType)) {
    return res.status(403).json({
      success: false,
      message: 'This category is reserved for one-tap report publishing and cannot be created manually.',
    });
  }

  const uploadedImageUrls = getUploadedPostImageUrls(req);
  const imageUrls = mergeImageUrls([], req.body.image_urls, image_url, uploadedImageUrls);

  const post = await Post.create({
    title,
    body,
    image_url: imageUrls[0] || null,
    image_urls: imageUrls.length ? JSON.stringify(imageUrls) : null,
    post_type,
    author_id: req.user.id,
  });

  logger.info(`New post created by user ${req.user.id}`);
  res.status(201).json({ success: true, data: post });
});

export const updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  const isOwner = post.author_id === req.user.id;
  const isPrivileged = req.user.role === 'admin' || req.user.role === 'responder';
  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ success: false, message: 'Not authorized to update this post' });
  }

  const { title, body, image_url, post_type, is_flagged, is_pinned } = req.body;
  const uploadedImageUrls = getUploadedPostImageUrls(req);
  const nextImageUrls = mergeImageUrls(post.image_urls, req.body.image_urls, image_url, uploadedImageUrls);
  if (title !== undefined) post.title = title;
  if (body !== undefined) post.body = body;
  if (req.body.image_urls !== undefined || image_url !== undefined || uploadedImageUrls.length > 0 || post.image_urls) {
    post.image_url = nextImageUrls[0] || null;
    post.image_urls = nextImageUrls.length ? JSON.stringify(nextImageUrls) : null;
  }
  if (post_type !== undefined) post.post_type = post_type;
  if (is_flagged !== undefined) post.is_flagged = Boolean(is_flagged);
  if (is_pinned !== undefined) post.is_pinned = Boolean(is_pinned);

  await post.save();
  res.status(200).json({ success: true, data: post });
});

export const deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  const isOwner = post.author_id === req.user.id;
  const isPrivileged = req.user.role === 'admin' || req.user.role === 'responder';
  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
  }

  await PostComment.destroy({ where: { post_id: post.id } });
  await PostLike.destroy({ where: { post_id: post.id } });
  await post.destroy();

  res.status(200).json({ success: true, message: 'Post deleted successfully' });
});

export const likePost = asyncHandler(async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  const existing = await PostLike.findOne({
    where: { post_id: post.id, user_id: req.user.id },
  });

  let liked;
  if (existing) {
    await existing.destroy();
    post.likes = Math.max(0, (post.likes || 1) - 1);
    liked = false;
  } else {
    await PostLike.create({ post_id: post.id, user_id: req.user.id });
    post.likes = (post.likes || 0) + 1;
    liked = true;
  }

  await post.save();
  res.status(200).json({ success: true, data: { liked, likes: post.likes } });
});

export const commentOnPost = asyncHandler(async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  const text = typeof req.body.body === 'string' ? req.body.body.trim() : '';
  const imageUrl = req.file ? `/uploads/comments/${req.file.filename}` : (req.body.image_url || null);

  if (!text && !imageUrl) {
    return res.status(400).json({ success: false, message: 'Comment text or image is required' });
  }

  const rawParentId = req.body.parent_comment_id;
  const parentCommentId = rawParentId === undefined || rawParentId === null || String(rawParentId).trim() === ''
    ? null
    : Number.parseInt(String(rawParentId), 10);

  if (parentCommentId !== null) {
    if (!Number.isInteger(parentCommentId) || parentCommentId <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid parent comment id' });
    }

    const parentComment = await PostComment.findByPk(parentCommentId);
    if (!parentComment) {
      return res.status(404).json({ success: false, message: 'Parent comment not found' });
    }

    if (Number(parentComment.post_id) !== Number(post.id)) {
      return res.status(400).json({ success: false, message: 'Parent comment does not belong to this post' });
    }
  }

  const comment = await PostComment.create({
    post_id: post.id,
    author_id: req.user.id,
    parent_comment_id: parentCommentId,
    body: text || ' ',
    image_url: imageUrl,
  });

  const withAuthor = await PostComment.findByPk(comment.id, {
    include: [
      { model: User, as: 'author', attributes: ['id', 'name', 'avatar'] },
      {
        model: PostCommentLike,
        as: 'comment_likes',
        attributes: ['id', 'user_id'],
        where: req.user?.id ? { user_id: req.user.id } : undefined,
        required: false,
      },
      {
        model: PostCommentReport,
        as: 'reports',
        required: false,
        include: [{ model: User, as: 'reporter', attributes: ['id', 'name'] }],
      },
    ],
  });

  res.status(201).json({
    success: true,
    data: { comment: normalizeCommentPayload(withAuthor, isModerator(req.user)) },
  });
});

export const reportComment = asyncHandler(async (req, res) => {
  const comment = await PostComment.findByPk(req.params.commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  if (comment.author_id === req.user.id) {
    return res.status(400).json({ success: false, message: 'You cannot report your own comment' });
  }

  const existing = await PostCommentReport.findOne({
    where: { comment_id: comment.id, reporter_id: req.user.id },
  });

  if (existing) {
    return res.status(200).json({
      success: true,
      message: 'Comment already reported by this user',
      data: {
        already_reported: true,
        report_count: Number(comment.flag_count || 0),
      },
    });
  }

  await PostCommentReport.create({
    comment_id: comment.id,
    reporter_id: req.user.id,
    reason: req.body.reason || 'other',
    details: req.body.details || null,
  });

  comment.flag_count = Number(comment.flag_count || 0) + 1;
  comment.is_flagged = true;
  await comment.save();

  res.status(200).json({
    success: true,
    message: 'Comment reported',
    data: {
      reported: true,
      report_count: Number(comment.flag_count || 0),
    },
  });
});

export const likeComment = asyncHandler(async (req, res) => {
  const comment = await PostComment.findByPk(req.params.commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  const existing = await PostCommentLike.findOne({
    where: { comment_id: comment.id, user_id: req.user.id },
  });

  let liked;
  if (existing) {
    await existing.destroy();
    liked = false;
  } else {
    await PostCommentLike.create({ comment_id: comment.id, user_id: req.user.id });
    liked = true;
  }

  const likes = await PostCommentLike.count({ where: { comment_id: comment.id } });
  res.status(200).json({ success: true, data: { liked, likes } });
});

export const unflagComment = asyncHandler(async (req, res) => {
  const comment = await PostComment.findByPk(req.params.commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  await PostCommentReport.destroy({ where: { comment_id: comment.id } });
  comment.is_flagged = false;
  comment.flag_count = 0;
  await comment.save();

  res.status(200).json({
    success: true,
    message: 'Comment unflagged',
    data: {
      reported: false,
      report_count: 0,
    },
  });
});

export const hideComment = asyncHandler(async (req, res) => {
  const comment = await PostComment.findByPk(req.params.commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  const hidden = typeof req.body.hidden === 'boolean' ? req.body.hidden : true;
  comment.hidden = hidden;
  await comment.save();

  res.status(200).json({ success: true, message: hidden ? 'Comment hidden' : 'Comment restored', data: { hidden } });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await PostComment.findByPk(req.params.commentId);
  if (!comment) {
    return res.status(404).json({ success: false, message: 'Comment not found' });
  }

  const canModerate = isModerator(req.user);
  const isOwner = comment.author_id === req.user.id;
  if (!canModerate && !isOwner) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this comment' });
  }

  await PostCommentReport.destroy({ where: { comment_id: comment.id } });
  await comment.destroy();

  res.status(200).json({ success: true, message: 'Comment deleted successfully' });
});

export const listFlaggedComments = asyncHandler(async (_req, res) => {
  const comments = await PostComment.findAll({
    where: { is_flagged: true },
    include: [
      { model: User, as: 'author', attributes: ['id', 'name', 'avatar'] },
      { model: Post, as: 'post', attributes: ['id', 'title', 'body', 'post_type'] },
      {
        model: PostCommentReport,
        as: 'reports',
        required: false,
        include: [{ model: User, as: 'reporter', attributes: ['id', 'name'] }],
      },
    ],
    order: [['updated_at', 'DESC']],
  });

  const data = comments.map((comment) => normalizeCommentPayload(comment, true));
  res.status(200).json({ success: true, count: data.length, data });
});

export const flagPost = asyncHandler(async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  post.flag_count = (post.flag_count || 0) + 1;
  post.is_flagged = true;
  await post.save();

  res.status(200).json({ success: true, message: 'Post flagged' });
});

export const unflagPost = asyncHandler(async (req, res) => {
  const post = await Post.findByPk(req.params.id);
  if (!post) {
    return res.status(404).json({ success: false, message: 'Post not found' });
  }

  post.is_flagged = false;
  post.flag_count = 0;
  await post.save();

  res.status(200).json({ success: true, message: 'Post unflagged', data: post });
});
