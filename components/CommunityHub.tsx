import React, { useState } from 'react';
import { Heart, ImagePlus, MessageSquareText, Plus, Search, Send, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { PageHeader } from './PageHeader';

import type { Post, PostCategory, User } from '../types';
import { Spinner } from './Spinner';
import { EmptyPanel, SectionHeading, StatusChip, SurfaceCard } from './WorkspacePrimitives';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

export const CommunityHub: React.FC = () => {
  const { t } = useTranslation();
  const { user, isLoggedIn, posts, addPost, likePost, addComment } = useAuth();

  const [activeCategory, setActiveCategory] = useState<PostCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredPosts = posts.filter(post => {
    const matchesCategory = activeCategory === 'all' || post.category === activeCategory;
    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) || post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="animate-fade-in pb-12">
      <PageHeader title={t('community.pageTitle')} subtitle={t('community.pageSubtitle')} imageUrl="/images/scene-community.svg" />

      <div className="mx-auto mt-[-4rem] max-w-6xl px-4">
        <SurfaceCard className="ui-surface p-5 md:p-6">
          <SectionHeading
            eyebrow={t('community.createPost')}
            title="Professional agronomy community"
            description="A cleaner knowledge exchange for field questions, practical tips, case studies, and moderated farmer collaboration."
            actions={
              <button onClick={() => setIsCreateModalOpen(true)} className="ui-button ui-button-primary">
                <Plus size={18} />
                <span>{t('community.createPost')}</span>
              </button>
            }
          />

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {['all', 'question', 'tips', 'showcase'].map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category as PostCategory | 'all')}
                  className={`rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                    activeCategory === category
                      ? 'bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(22,101,52,0.14)]'
                      : 'border border-[var(--ag-border)] bg-[var(--ag-surface-muted)] text-[var(--ag-text-muted)] hover:border-[var(--ag-border-strong)] hover:text-[var(--ag-text)]'
                  }`}
                >
                  {t(`community.categories.${category}`)}
                </button>
              ))}
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ag-text-soft)]" size={16} />
              <input
                type="text"
                placeholder={t('community.searchPlaceholder')}
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                className="ui-input !pl-11"
              />
            </div>
          </div>
        </SurfaceCard>

        <div className="mt-8 space-y-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map(post => <PostCard key={post.id} post={post} user={user} onLike={likePost} onComment={addComment} t={t} />)
          ) : (
            <EmptyPanel title={t('community.noPosts')} description="No posts match the selected category or search term yet." icon={<Sparkles size={22} />} />
          )}
        </div>
      </div>

      {isCreateModalOpen ? (
        <CreatePostModal
          onClose={() => setIsCreateModalOpen(false)}
          onSave={(post: NewPostPayload) => {
            addPost(post);
            setIsCreateModalOpen(false);
          }}
          user={user}
          isLoggedIn={isLoggedIn}
        />
      ) : null}
    </div>
  );
};

export const PostCard: React.FC<{
  post: Post;
  user: User | null;
  onLike: (id: string) => void;
  onComment: (id: string, text: string) => void;
  t: (key: string, params?: Record<string, string>) => string;
}> = ({ post, user, onLike, onComment, t }) => {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const isLiked = Boolean(user && post.likedByMe);

  const handleCommentSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText('');
    }
  };

  return (
    <SurfaceCard className="ui-surface p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={post.authorAvatar} alt={post.authorName} className="h-12 w-12 rounded-2xl object-cover" />
          <div>
            <h3 className="text-sm font-bold text-[var(--ag-text)]">{post.authorName}</h3>
            <p className="mt-1 text-xs text-[var(--ag-text-muted)]">{post.timestamp}</p>
          </div>
        </div>
        <StatusChip tone={post.category === 'question' ? 'blue' : post.category === 'tips' ? 'forest' : 'amber'}>
          {t(`community.categories.${post.category}`)}
        </StatusChip>
      </div>

      <div className="mt-5">
        <h2 className="text-2xl font-extrabold tracking-[-0.04em] text-[var(--ag-text)]">{post.title}</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ag-text-muted)] whitespace-pre-wrap">{post.content}</p>
      </div>

      {post.imageUrl ? (
        <div className="mt-5 overflow-hidden rounded-[1.5rem]">
          <img src={post.imageUrl} alt="Post Attachment" className="h-72 w-full object-cover" />
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-2">
        <StatusChip tone="forest">
          <ShieldCheck size={14} />
          <span>{t('community.moderatorBadge')}</span>
        </StatusChip>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[var(--ag-border)] pt-5">
        <button
          onClick={() => (user ? onLike(post.id) : alert(t('community.post.loginToInteract')))}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            isLiked ? 'bg-red-50 text-red-500 dark:bg-red-900/20' : 'bg-[var(--ag-surface-muted)] text-[var(--ag-text-muted)] hover:text-red-500'
          }`}
        >
          <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
          <span>
            {post.likes} {t('community.post.like')}
          </span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--ag-surface-muted)] px-4 py-2 text-sm font-bold text-[var(--ag-text-muted)] transition-colors hover:text-brand-blue"
        >
          <MessageSquareText size={16} />
          <span>
            {post.comments.length} {t('community.post.comment')}
          </span>
        </button>
      </div>

      {showComments ? (
        <div className="mt-5 rounded-[1.5rem] bg-[var(--ag-surface-muted)] p-4">
          <div className="space-y-4">
            {post.comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <img src={comment.authorAvatar} alt={comment.authorName} className="h-9 w-9 rounded-xl object-cover" />
                <div className="flex-1 rounded-[1.15rem] bg-white/78 p-3 dark:bg-white/4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-[var(--ag-text)]">{comment.authorName}</p>
                    <span className="text-xs text-[var(--ag-text-soft)]">{comment.timestamp}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--ag-text-muted)]">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>

          {user ? (
            <form onSubmit={handleCommentSubmit} className="mt-4 flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={event => setCommentText(event.target.value)}
                placeholder={t('community.post.addComment')}
                className="ui-input"
              />
              <button type="submit" disabled={!commentText.trim()} className="ui-button ui-button-primary !px-4">
                <Send size={16} />
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-[var(--ag-text-muted)]">{t('community.post.loginToInteract')}</p>
          )}
        </div>
      ) : null}
    </SurfaceCard>
  );
};

interface NewPostPayload {
  authorName: string;
  authorAvatar: string;
  title: string;
  content: string;
  category: PostCategory;
  imageUrl: string | null;
}

const CreatePostModal: React.FC<{
  onClose: () => void;
  onSave: (post: NewPostPayload) => void;
  user: User | null;
  isLoggedIn: boolean;
}> = ({ onClose, onSave, user, isLoggedIn }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('general');
  const [image, setImage] = useState<string | null>(null);
  const [isModerating] = useState(false);

  if (!isLoggedIn || !user) {
    return (
      <div className="ui-modal-backdrop">
        <div className="ui-modal-panel p-8 text-center">
          <p className="text-lg font-bold text-[var(--ag-text)]">{t('community.createModal.loginReq')}</p>
          <div className="mt-6">
            <button onClick={onClose} className="ui-button ui-button-primary">
              {t('modals.trackedPlant.close')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0]) {
      const base64 = await fileToBase64(event.target.files[0]);
      setImage(base64);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !content.trim()) return;
    onSave({
      authorName: user.name,
      authorAvatar: user.profilePicture,
      title,
      content,
      category,
      imageUrl: image,
    });
  };

  return (
    <div className="ui-modal-backdrop">
      <div className="ui-modal-panel max-w-2xl">
        <div className="flex items-center justify-between border-b border-[var(--ag-border)] px-6 py-5">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--ag-text-soft)]">{t('community.createModal.title')}</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[var(--ag-text)]">Compose a post</h2>
          </div>
          <button onClick={onClose} className="ui-button ui-button-ghost !min-h-[2.5rem] !px-3">
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <label className="ui-field">
            <span className="ui-label">{t('community.createModal.postTitle')}</span>
            <input type="text" value={title} onChange={event => setTitle(event.target.value)} className="ui-input" placeholder={t('community.createModal.titlePlaceholder')} required />
          </label>

          <label className="ui-field">
            <span className="ui-label">{t('community.createModal.category')}</span>
            <select value={category} onChange={event => setCategory(event.target.value as PostCategory)} className="ui-select">
              <option value="general">{t('community.categories.general')}</option>
              <option value="question">{t('community.categories.question')}</option>
              <option value="tips">{t('community.categories.tips')}</option>
              <option value="showcase">{t('community.categories.showcase')}</option>
            </select>
          </label>

          <label className="ui-field">
            <span className="ui-label">{t('community.createModal.content')}</span>
            <textarea value={content} onChange={event => setContent(event.target.value)} className="ui-textarea" placeholder={t('community.createModal.contentPlaceholder')} required />
          </label>

          <div className="rounded-[1.4rem] border border-dashed border-[var(--ag-border-strong)] p-4">
            <div className="flex items-center gap-3 text-sm font-semibold text-[var(--ag-text-muted)]">
              <ImagePlus size={18} />
              <span>{t('community.createModal.image')}</span>
            </div>
            {image ? <img src={image} alt="Preview" className="mt-4 h-40 rounded-[1.2rem] object-cover" /> : null}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="mt-4 block w-full text-sm text-[var(--ag-text-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-brand-green/10 file:px-4 file:py-2 file:font-bold file:text-brand-green-dark hover:file:bg-brand-green/20 dark:file:text-brand-green-light"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="ui-button ui-button-secondary">
              {t('modals.farm.cancel')}
            </button>
            <button type="submit" disabled={isModerating} className="ui-button ui-button-primary">
              {isModerating ? <Spinner small /> : null}
              <span>{isModerating ? t('community.createModal.moderating') : t('community.createModal.submit')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
