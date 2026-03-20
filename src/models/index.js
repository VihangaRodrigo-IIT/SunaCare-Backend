import { User } from './User.model.js';
import { NgoApplication } from './NgoApplication.model.js';
import { PetReport } from './PetReport.model.js';
import { NgoVerification } from './NgoVerification.model.js';
import { OtpVerification } from './OtpVerification.model.js';
import { Report } from './Report.model.js';
import { Pet } from './Pet.model.js';
import { Campaign } from './Campaign.model.js';
import { Donation } from './Donation.model.js';
import { Post } from './Post.model.js';
import { PostComment } from './PostComment.model.js';
import { PostCommentReport } from './PostCommentReport.model.js';
import { PostCommentLike } from './PostCommentLike.model.js';
import { PostLike } from './PostLike.model.js';
import { Article } from './Article.model.js';
import { ArticleView } from './ArticleView.model.js';
import { UserSettings } from './UserSettings.model.js';

// ─── NgoApplication ↔ User ───────────────────────────────────────────────────
// An approved application creates one User (responder) and one NgoVerification
NgoApplication.belongsTo(User,  { as: 'reviewer',  foreignKey: 'reviewed_by' });
NgoApplication.hasOne(NgoVerification, { foreignKey: 'application_id', as: 'verification' });
NgoVerification.belongsTo(NgoApplication, { foreignKey: 'application_id', as: 'application' });
NgoVerification.belongsTo(User,          { foreignKey: 'user_id',         as: 'user' });
User.hasOne(NgoVerification, { foreignKey: 'user_id', as: 'ngo_verification' });
User.belongsTo(NgoApplication, { foreignKey: 'ngo_application_id', as: 'ngo_application' });

// ─── Reports ──────────────────────────────────────────────────────────────────
Report.belongsTo(User, { foreignKey: 'created_by',  as: 'reporter' });
Report.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
User.hasMany(Report,   { foreignKey: 'created_by',  as: 'reports' });

// ─── Pets ─────────────────────────────────────────────────────────────────────
Pet.belongsTo(User, { foreignKey: 'posted_by', as: 'poster' });
User.hasMany(Pet,   { foreignKey: 'posted_by', as: 'pets' });

// ─── Pet Reports ─────────────────────────────────────────────────────────────
PetReport.belongsTo(Pet,  { foreignKey: 'pet_id',      as: 'pet',      onDelete: 'SET NULL', constraints: false });
PetReport.belongsTo(User, { foreignKey: 'reported_by', as: 'reporter', onDelete: 'SET NULL', constraints: false });
Pet.hasMany(PetReport,    { foreignKey: 'pet_id',      as: 'pet_reports' });
User.hasMany(PetReport,   { foreignKey: 'reported_by', as: 'pet_reports' });

// ─── Campaigns & Donations ───────────────────────────────────────────────────
Campaign.belongsTo(User,  { foreignKey: 'created_by',  as: 'creator' });
Campaign.hasMany(Donation,{ foreignKey: 'campaign_id', as: 'donations' });
Donation.belongsTo(Campaign, { foreignKey: 'campaign_id', as: 'campaign' });
Donation.belongsTo(User,     { foreignKey: 'donor_id',    as: 'donor' });
User.hasMany(Donation, { foreignKey: 'donor_id', as: 'donations' });

// ─── Posts, Comments & Likes ─────────────────────────────────────────────────
Post.belongsTo(User,    { foreignKey: 'author_id', as: 'author' });
Post.hasMany(PostComment, { foreignKey: 'post_id',  as: 'comments' });
Post.hasMany(PostLike,    { foreignKey: 'post_id',  as: 'post_likes' });
PostComment.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });
PostComment.belongsTo(User, { foreignKey: 'author_id', as: 'author' });
PostComment.hasMany(PostCommentReport, { foreignKey: 'comment_id', as: 'reports' });
PostComment.hasMany(PostCommentLike, { foreignKey: 'comment_id', as: 'comment_likes' });
PostCommentReport.belongsTo(PostComment, { foreignKey: 'comment_id', as: 'comment' });
PostCommentReport.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });
PostCommentLike.belongsTo(PostComment, { foreignKey: 'comment_id', as: 'comment' });
PostCommentLike.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
PostLike.belongsTo(Post,    { foreignKey: 'post_id' });
PostLike.belongsTo(User,    { foreignKey: 'user_id' });
User.hasMany(Post,        { foreignKey: 'author_id', as: 'posts' });
User.hasMany(PostLike,    { foreignKey: 'user_id',   as: 'post_likes' });
User.hasMany(PostComment, { foreignKey: 'author_id', as: 'post_comments' });
User.hasMany(PostCommentReport, { foreignKey: 'reporter_id', as: 'comment_reports' });
User.hasMany(PostCommentLike, { foreignKey: 'user_id', as: 'post_comment_likes' });

// ─── Articles & Views ─────────────────────────────────────────────────────────
Article.belongsTo(User,  { foreignKey: 'author_id',  as: 'author' });
Article.hasMany(ArticleView, { foreignKey: 'article_id', as: 'views' });
ArticleView.belongsTo(Article, { foreignKey: 'article_id', as: 'article' });
ArticleView.belongsTo(User,    { foreignKey: 'user_id',    as: 'viewer' });
User.hasMany(Article,     { foreignKey: 'author_id',  as: 'articles' });
User.hasMany(ArticleView, { foreignKey: 'user_id',    as: 'article_views' });

// ─── User Settings ────────────────────────────────────────────────────────────
User.hasOne(UserSettings, { foreignKey: 'user_id', as: 'settings' });
UserSettings.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export {
  User, NgoApplication, NgoVerification, OtpVerification,
  Report, Pet, PetReport, Campaign, Donation,
  Post, PostComment, PostCommentReport, PostCommentLike, PostLike, Article, ArticleView,
  UserSettings,
};
