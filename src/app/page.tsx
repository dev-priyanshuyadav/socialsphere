"use client";

import { useEffect, useState, useTransition } from "react";
import { addComment, createPost, getFeed, toggleBookmark, toggleLike } from "@/app/actions/social";
import { getStories, type StoryPreview } from "@/app/actions/stories";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FeedPost, FeedUser } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { uploadMediaFile } from "@/lib/supabase/uploads";
import {
  Bookmark, Compass, Heart, Home, ImagePlus, MessageCircle,
  MoreHorizontal, Plus, Search, Send, Smile, Users, X, Menu,
  Clapperboard, UserRound,
} from "lucide-react";

type Post = FeedPost;

function Avatar({ src, size = "md", ring = false }: { src: string; size?: "sm" | "md" | "lg"; ring?: boolean }) {
  return <img className={`avatar avatar-${size} ${ring ? "avatar-ring" : ""}`} src={src} alt="User avatar" />;
}

function Sidebar({ mobileOpen, closeMobile, currentUser, onCreatePost }: {
  mobileOpen: boolean; closeMobile: () => void; currentUser: FeedUser | null; onCreatePost: () => void;
}) {
  const links = [
    { label: "Home", icon: Home, href: "/" },
    { label: "Search", icon: Search, href: "/search" },
    { label: "Explore", icon: Compass, href: "/search" },
    { label: "Reels", icon: Clapperboard, href: "/reels" },
    { label: "Messages", icon: MessageCircle, href: "/messages" },
    { label: "Notifications", icon: Heart, href: "/notifications" },
    { label: "Communities", icon: Users, href: "/communities" },
    { label: "Saved", icon: Bookmark, href: "/saved" },
  ];
  return (
    <>
      {mobileOpen && <button className="mobile-overlay" onClick={closeMobile} aria-label="Close menu" />}
      <aside className={`sidebar ig-sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <Link href="/" className="brand ig-brand">SocialSphere</Link>
        <nav className="nav-list ig-nav" aria-label="Main navigation">
          {links.map(({ label, icon: Icon, href }) => (
            <Link key={label} className={`nav-item ig-nav-item ${label === "Home" ? "nav-active" : ""}`} href={href} onClick={closeMobile}>
              <Icon size={24} strokeWidth={label === "Home" ? 2.4 : 1.8} /><span>{label}</span>
            </Link>
          ))}
          <button className="nav-item ig-nav-item" type="button" onClick={() => { closeMobile(); onCreatePost(); }}>
            <Plus size={24} strokeWidth={1.8} /><span>Create</span>
          </button>
          <Link className="nav-item ig-nav-item" href="/profile" onClick={closeMobile}>
            <Avatar src={currentUser?.profile?.avatar_url ?? "/avatar-placeholder.svg"} size="sm" /><span>Profile</span>
          </Link>
        </nav>
        <div className="ig-sidebar-bottom">
          <Link className="nav-item ig-nav-item" href="/settings" onClick={closeMobile}><Menu size={24} /><span>More</span></Link>
          <div className="sidebar-footer"><Link href="/privacy">Privacy</Link><span>·</span><Link href="/terms">Terms</Link><span>·</span><Link href="/help">Help</Link></div>
        </div>
      </aside>
    </>
  );
}

function PostCard({ post, liked, saved, onLike, onSave, onComment }: { post: Post; liked: boolean; saved: boolean; onLike: (id: string) => void; onSave: (id: string) => void; onComment: (id: string, content: string) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  return (
    <article className="post-card ig-post">
      <div className="post-header ig-post-header" id={`post-${post.id}`}>
        <Avatar src={post.avatar} />
        <div className="post-author">
          <div className="author-line"><Link className="post-author-link" href={`/u/${post.handle.slice(1)}`}>{post.handle.slice(1)}</Link><span className="ig-dot">·</span><span className="post-time">{post.time}</span></div>
          <span className="post-handle">{post.name}</span>
        </div>
        <button className="icon-button ig-more" aria-label="More post options"><MoreHorizontal size={22} /></button>
      </div>
      {post.image && <div className="post-image-wrap ig-post-media">{post.mediaType === 'video'
        ? <video className="post-image" src={post.image} controls playsInline />
        : <img className="post-image" src={post.image} alt="Shared post" />}</div>}
      <div className="post-actions ig-post-actions">
        <button className={`post-action ${liked ? "liked" : ""}`} onClick={() => onLike(post.id)} aria-label={liked ? "Unlike post" : "Like post"}><Heart size={25} fill={liked ? "currentColor" : "none"} /></button>
        <button className="post-action" onClick={() => setExpanded(!expanded)} aria-label="Comment"><MessageCircle size={25} /></button>
        <Link className="post-action" href={`/post/${post.id}`} aria-label="Open post"><Send size={24} /></Link>
        <button className={`post-action save-action ${saved ? "saved" : ""}`} onClick={() => onSave(post.id)} aria-label={saved ? "Remove saved post" : "Save post"}><Bookmark size={24} fill={saved ? "currentColor" : "none"} /></button>
      </div>
      <div className="ig-post-caption"><strong>{post.likes.toLocaleString()} likes</strong>{post.text && <p><Link href={`/u/${post.handle.slice(1)}`}>{post.handle.slice(1)}</Link> {post.text}</p>}{post.comments > 0 && <Link className="ig-comments-link" href={`/post/${post.id}`}>View all {post.comments} comments</Link>}</div>
      {expanded && <form className="comment-box ig-comment-box" onSubmit={async (event) => { event.preventDefault(); if (!comment.trim()) return; setCommentBusy(true); try { await onComment(post.id, comment); setComment(""); } catch { /* parent displays the error */ } finally { setCommentBusy(false); } }}><input value={comment} onChange={event => setComment(event.target.value)} placeholder="Add a comment..." /><button disabled={commentBusy || !comment.trim()} aria-label="Send comment"><Send size={17} /></button></form>}
    </article>
  );
}

export default function HomePage() {
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<FeedUser | null>(null);
  const [busy, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<StoryPreview[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  useEffect(() => {
    getFeed().then((result) => {
      if (!result.user) { router.replace('/login'); return; }
      setCurrentUser(result.user);
      setPosts(result.posts);
      setLiked(result.posts.filter(post => post.liked).map(post => post.id));
      setSaved(result.bookmarks);
      getStories().then(setStories).catch((error) => setNotice(error instanceof Error ? error.message : 'Unable to load stories.'));
    }).catch((error) => setNotice(error instanceof Error ? error.message : 'Unable to load your feed.'))
      .finally(() => setFeedLoading(false));
  }, [router]);

  async function publishPost() {
    if (!draft.trim() && !mediaFile) return;
    startTransition(async () => {
      try {
        const formData = new FormData(); formData.set('content', draft.trim());
        if (mediaFile) {
          if (!currentUser) throw new Error('Your account is still loading.');
          const uploaded = await uploadMediaFile(createClient(), currentUser.id, mediaFile, 'social-media-private');
          formData.set('media_url', uploaded.path);
          formData.set('media_type', uploaded.mediaType);
        }
        await createPost(formData);
        setDraft(""); setMediaFile(null); setComposerOpen(false); setNotice('Your post was published.');
        const result = await getFeed(); setPosts(result.posts);
      } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to publish post.'); }
    });
  }

  async function handleLike(id: string) {
    try { await toggleLike(id); setLiked(old => old.includes(id) ? old.filter(item => item !== id) : [...old, id]); setPosts(old => old.map(post => post.id === id ? { ...post, likes: post.likes + (liked.includes(id) ? -1 : 1) } : post)); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to update like.'); }
  }

  async function handleSave(id: string) {
    try { await toggleBookmark(id); setSaved(old => old.includes(id) ? old.filter(item => item !== id) : [...old, id]); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to save post.'); }
  }

  async function handleComment(id: string, content: string) {
    try { await addComment(id, content); setPosts(old => old.map(post => post.id === id ? { ...post, comments: post.comments + 1 } : post)); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to add comment.'); throw error; }
  }

  return (
    <div className="app-shell ig-app">
      <Sidebar mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} currentUser={currentUser} onCreatePost={() => setComposerOpen(true)} />
      <main className="main-area ig-main">
        {notice && <div role="status" className="app-notice">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
        <header className="topbar ig-topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <Link href="/" className="ig-mobile-brand">SocialSphere</Link>
          <div className="topbar-right">
            <Link href="/messages" className="ig-mobile-action" aria-label="Messages"><MessageCircle size={23} /></Link>
          </div>
        </header>

        <div className="content-grid ig-layout">
          <section className="feed-column ig-feed">
            <section className="stories-section ig-stories" aria-label="Stories">
              <div className="stories-row ig-stories-row">
                <Link className="story-item ig-story ig-your-story" href="/stories/create">
                  <span className="ig-story-avatar"><Avatar src={currentUser?.profile?.avatar_url ?? "/avatar-placeholder.svg"} size="lg" /><i><Plus size={15} /></i></span>
                  <span>Your story</span>
                </Link>
                {stories.map(story => <Link className="story-item ig-story" href={`/stories/${story.id}`} key={story.id}>
                  <span className="ig-story-avatar"><Avatar src={story.avatar ?? "/avatar-placeholder.svg"} size="lg" /></span>
                  <span>{story.username}</span>
                </Link>)}
              </div>
            </section>

            <section className="feed-section ig-feed-section" aria-label="Your feed">
              {feedLoading ? <div className="ig-loading"><span /><span /><span /></div>
                : posts.length ? posts.map(post => <PostCard key={post.id} post={post} liked={liked.includes(post.id)} saved={saved.includes(post.id)} onLike={handleLike} onSave={handleSave} onComment={handleComment} />)
                  : <div className="empty-state ig-empty"><div className="ig-empty-icon"><ImagePlus size={28} /></div><strong>Share your first moment</strong><span>When you share a photo or video, it will appear here.</span><button className="text-button" onClick={() => setComposerOpen(true)}>Create post</button></div>}
            </section>
          </section>

          <aside className="right-column ig-right">
            <Link className="ig-account" href="/profile">
              <Avatar src={currentUser?.profile?.avatar_url ?? "/avatar-placeholder.svg"} size="md" />
              <span><strong>@{currentUser?.profile?.username ?? "username"}</strong><small>{currentUser?.profile?.display_name ?? "Your profile"}</small></span>
              <b>Switch</b>
            </Link>
            <section className="ig-suggestions">
              <div className="ig-suggestions-heading"><strong>Discover people</strong><Link href="/search">See all</Link></div>
              <p>Find people and communities to follow on SocialSphere.</p>
              <Link href="/search" className="ig-discover-link"><Compass size={17} /> Explore people</Link>
              <Link href="/communities" className="ig-discover-link"><Users size={17} /> Browse communities</Link>
            </section>
            <div className="right-footer ig-footer"><Link href="/about">About</Link> · <Link href="/help">Help</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link><br />© 2026 SocialSphere</div>
          </aside>
        </div>
      </main>

      <nav className="ig-mobile-nav" aria-label="Mobile navigation">
        <Link href="/" aria-label="Home"><Home size={24} /></Link>
        <Link href="/search" aria-label="Explore"><Compass size={24} /></Link>
        <button type="button" onClick={() => setComposerOpen(true)} aria-label="Create post"><Plus size={24} /></button>
        <Link href="/messages" aria-label="Messages"><MessageCircle size={24} /></Link>
        <Link href="/profile" aria-label="Profile"><UserRound size={23} /></Link>
      </nav>

      <button className="mobile-fab" onClick={() => setComposerOpen(true)} aria-label="Create post"><Plus size={23} /></button>

      {composerOpen && <div className="modal-backdrop" onClick={() => setComposerOpen(false)}><div className="composer-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><div><h2>Create a post</h2><p>Share a moment with your community.</p></div><button className="icon-button" onClick={() => { setComposerOpen(false); setMediaFile(null); }} aria-label="Close"><X size={20} /></button></div>
        <div className="modal-user"><Avatar src={currentUser?.profile?.avatar_url ?? "/avatar-placeholder.svg"} /><div><strong>{currentUser?.profile?.display_name ?? "Your account"}</strong><span>Share with your community</span></div></div>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="What's on your mind?" autoFocus />
        <div className="modal-tools"><label className="media-picker"><ImagePlus size={18} /> {mediaFile ? mediaFile.name : "Photo or video"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={event => setMediaFile(event.target.files?.[0] ?? null)} /></label><button type="button" disabled><Smile size={18} /> Feeling</button></div>
        <button className="primary-button publish-button" disabled={(!draft.trim() && !mediaFile) || busy} onClick={publishPost}>{busy ? "Publishing…" : "Publish post"} <Send size={16} /></button>
      </div></div>}
    </div>
  );
}
