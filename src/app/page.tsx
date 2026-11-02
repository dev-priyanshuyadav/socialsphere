"use client";

import { useEffect, useState, useTransition } from "react";
import { addComment, createPost, getFeed, toggleBookmark, toggleLike, uploadPostMedia } from "@/app/actions/social";
import { getStories, type StoryPreview } from "@/app/actions/stories";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { FeedPost, FeedUser } from "@/lib/supabase/types";
import {
  Bell, Bookmark, Compass, Heart, Home, ImagePlus, MessageCircle,
  MoreHorizontal, Plus, Search, Send, Settings, Smile, Sparkles, Users,
  Video, X, Menu, ChevronDown,
} from "lucide-react";

type Post = FeedPost;

function Avatar({ src, size = "md", ring = false }: { src: string; size?: "sm" | "md" | "lg"; ring?: boolean }) {
  return <img className={`avatar avatar-${size} ${ring ? "avatar-ring" : ""}`} src={src} alt="User avatar" />;
}

function Sidebar({ mobileOpen, closeMobile, currentUser }: {
  mobileOpen: boolean; closeMobile: () => void; currentUser: FeedUser | null;
}) {
  const links = [
    { label: "Home", icon: Home, href: "/" }, { label: "Explore", icon: Compass, href: "/search" },
    { label: "Messages", icon: MessageCircle, href: "/messages" }, { label: "Reels", icon: Video, href: "/reels" },
    { label: "Notifications", icon: Bell, href: "/notifications" },
    { label: "Communities", icon: Users, href: "/communities" }, { label: "Saved", icon: Bookmark, href: "/saved" },
  ];
  return (
    <>
      {mobileOpen && <button className="mobile-overlay" onClick={closeMobile} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Sparkles size={19} /></div><span>social<span className="brand-accent">sphere</span></span></div>
        <Link href="/profile" className="profile-switch">
          <Avatar src={currentUser?.profile?.avatar_url ?? "/avatar-placeholder.svg"} size="md" />
          <span className="profile-switch-text"><strong>{currentUser?.profile?.display_name ?? "Your account"}</strong><small>@{currentUser?.profile?.username ?? "username"}</small></span>
          <ChevronDown size={16} className="muted" />
        </Link>
        <div className="nav-label">MENU</div>
        <nav className="nav-list">
          {links.map(({ label, icon: Icon, href }) => (
            <Link key={label} className={`nav-item ${label === "Home" ? "nav-active" : ""}`} href={href} onClick={closeMobile}>
              <Icon size={19} strokeWidth={1.9} /><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="nav-label nav-label-spaced">YOUR SPACE</div>
        <nav className="nav-list">
          <Link className="nav-item" href="/profile"><Users size={19} /><span>My profile</span></Link>
          <Link className="nav-item" href="/settings"><Settings size={19} /><span>Settings</span></Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Sparkles size={17} /></div>
            <strong>Make your space yours</strong>
            <p>Discover more ways to connect with your community.</p>
            <Link href="/search">Explore features <span>↗</span></Link>
          </div>
          <div className="sidebar-footer"><span>© 2026 SocialSphere</span><span>·</span><Link href="/privacy">Privacy</Link><span>·</span><Link href="/terms">Terms</Link><span>·</span><Link href="/help">Help</Link></div>
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
    <article className="post-card">
      <div className="post-header" id={`post-${post.id}`}>
        <Avatar src={post.avatar} />
        <div className="post-author">
          <div className="author-line"><Link className="post-author-link" href={`/u/${post.handle.slice(1)}`}>{post.name}</Link><span className="post-handle">{post.handle}</span></div>
          <span className="post-time">{post.time} <span>·</span> <span className="globe">◎</span></span>
        </div>
        <button className="icon-button" aria-label="More post options"><MoreHorizontal size={21} /></button>
      </div>
      <div className="post-copy">{post.text}</div>
      {post.image && <div className="post-image-wrap">{post.mediaType === 'video'
        ? <video className="post-image" src={post.image} controls playsInline />
        : <img className="post-image" src={post.image} alt="Shared post" />}</div>}
      <div className="post-stats"><span>{post.likes.toLocaleString()} likes</span><Link href={`/post/${post.id}`}>{post.comments} comments · View post</Link></div>
      <div className="post-actions">
        <button className={`post-action ${liked ? "liked" : ""}`} onClick={() => onLike(post.id)}><Heart size={19} fill={liked ? "currentColor" : "none"} /> <span>Like</span></button>
        <button className="post-action" onClick={() => setExpanded(!expanded)}><MessageCircle size={19} /><span>Comment</span></button>
        <button className="post-action"><Send size={18} /><span>Share</span></button>
        <button className={`post-action save-action ${saved ? "saved" : ""}`} onClick={() => onSave(post.id)} aria-label="Save post"><Bookmark size={19} fill={saved ? "currentColor" : "none"} /></button>
      </div>
      {expanded && <form className="comment-box" onSubmit={async (event) => { event.preventDefault(); if (!comment.trim()) return; setCommentBusy(true); try { await onComment(post.id, comment); setComment(""); } catch { /* parent displays the error */ } finally { setCommentBusy(false); } }}><Avatar src="/avatar-placeholder.svg" size="sm" /><input value={comment} onChange={event => setComment(event.target.value)} placeholder="Write a thoughtful comment..." /><button disabled={commentBusy || !comment.trim()} aria-label="Send comment"><Send size={17} /></button></form>}
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

  useEffect(() => {
    getFeed().then((result) => {
      if (!result.user) { router.replace('/login'); return; }
      setCurrentUser(result.user);
      setPosts(result.posts);
      setLiked(result.posts.filter(post => post.liked).map(post => post.id));
      setSaved(result.bookmarks);
    }).catch((error) => setNotice(error instanceof Error ? error.message : 'Unable to load your feed.'));
    getStories().then(setStories).catch((error) => setNotice(error instanceof Error ? error.message : 'Unable to load stories.'));
  }, [router]);

  async function publishPost() {
    if (!draft.trim() && !mediaFile) return;
    startTransition(async () => {
      try {
        const formData = new FormData(); formData.set('content', draft.trim());
        if (mediaFile) { const uploadData = new FormData(); uploadData.set('file', mediaFile); const mediaUrl = await uploadPostMedia(uploadData); formData.set('media_url', mediaUrl); formData.set('media_type', mediaFile.type.startsWith('video/') ? 'video' : 'image'); }
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
    <div className="app-shell">
      <Sidebar mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} currentUser={currentUser} />
      <main className="main-area">
        {notice && <div role="status" className="app-notice">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <div className="breadcrumb"><span>Pages</span><span className="crumb-slash">/</span><strong>Home</strong></div>
          <div className="topbar-right">
            <form className="search-box" action="/search"><Search size={17} /><input name="q" placeholder="Search anything..." /><kbd>Enter</kbd></form>
            <button className="top-icon" aria-label="Notifications"><Bell size={19} /><i /></button>
            <Avatar src="/avatar-placeholder.svg" size="sm" />
          </div>
        </header>

        <div className="content-grid">
          <section className="feed-column">
            <div className="welcome-row"><div><div className="eyebrow"><Sparkles size={13} /> YOUR COMMUNITY, YOUR SPACE</div><h1>Welcome back, {currentUser?.profile?.display_name?.split(" ")[0] ?? "there"} <span>✦</span></h1><p>Here&apos;s what&apos;s happening in your world today.</p></div><button className="primary-button desktop-create" onClick={() => setComposerOpen(true)}><Plus size={18} /> Create post</button></div>

            <section className="stories-section">
              <div className="section-heading"><div><h2>Stories</h2><p>Fresh moments, gone in 24 hours</p></div><Link className="text-button" href="/stories/create">Add story <span>+</span></Link></div>
              <div className="stories-row">
                {stories.map(story => <Link className="story-item" href={`/stories/${story.id}`} key={story.id}>
                  <div className="story-ring"><img className="avatar avatar-lg" src={story.avatar ?? story.url} alt="" /></div>
                  <span>{story.displayName}</span>
                </Link>)}
              </div>
            </section>

            <section className="feed-section">
              <div className="feed-heading"><div><h2>Your feed</h2><p>Latest public posts from the community</p></div></div>
              <div className="quick-composer">
                <Avatar src={currentUser?.profile?.avatar_url ?? "/avatar-placeholder.svg"} />
                <button onClick={() => setComposerOpen(true)}>Share something with your community...</button>
                <button className="composer-image" onClick={() => setComposerOpen(true)} aria-label="Add image"><ImagePlus size={19} /></button>
              </div>
              {posts.length ? posts.map(post => <PostCard key={post.id} post={post} liked={liked.includes(post.id)} saved={saved.includes(post.id)} onLike={handleLike} onSave={handleSave} onComment={handleComment} />) : <div className="empty-state"><Search size={24} /><strong>No posts yet</strong><span>Be the first to share something with your community.</span></div>}
            </section>
          </section>

          <aside className="right-column">
            <section className="right-card profile-card">
              <div className="profile-cover" />
              <Avatar src={currentUser?.profile?.avatar_url ?? "/avatar-placeholder.svg"} size="lg" />
              <div className="profile-card-name"><strong>{currentUser?.profile?.display_name ?? "Your profile"}</strong></div>
              <p>@{currentUser?.profile?.username ?? "username"}</p>
              <div className="profile-bio">{currentUser?.profile?.bio ?? "Add a bio to tell your community about yourself."}</div>
              <div className="profile-metrics">
                <div><strong>{currentUser?.stats?.posts ?? 0}</strong><span>Posts</span></div>
                <div><strong>{currentUser?.stats?.followers ?? 0}</strong><span>Followers</span></div>
                <div><strong>{currentUser?.stats?.following ?? 0}</strong><span>Following</span></div>
              </div>
              <Link className="outline-button profile-view-link" href="/profile">View profile</Link>
            </section>

            <div className="right-footer"><Link href="/about">About</Link> · <Link href="/help">Help</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link><br />© 2026 SocialSphere</div>
          </aside>
        </div>
      </main>

      <button className="mobile-fab" onClick={() => setComposerOpen(true)} aria-label="Create post"><Plus size={23} /></button>

      {composerOpen && <div className="modal-backdrop" onClick={() => setComposerOpen(false)}><div className="composer-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><div><h2>Create a post</h2><p>Share a moment with your community.</p></div><button className="icon-button" onClick={() => { setComposerOpen(false); setMediaFile(null); }} aria-label="Close"><X size={20} /></button></div>
        <div className="modal-user"><Avatar src={currentUser?.profile?.avatar_url ?? "/avatar-placeholder.svg"} /><div><strong>{currentUser?.profile?.display_name ?? "Your account"}</strong><span>Posting to everyone</span></div></div>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} placeholder="What's on your mind?" autoFocus />
        <div className="modal-tools"><label className="media-picker"><ImagePlus size={18} /> {mediaFile ? mediaFile.name : "Photo or video"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" onChange={event => setMediaFile(event.target.files?.[0] ?? null)} /></label><button type="button" disabled><Smile size={18} /> Feeling</button></div>
        <button className="primary-button publish-button" disabled={(!draft.trim() && !mediaFile) || busy} onClick={publishPost}>{busy ? "Publishing…" : "Publish post"} <Send size={16} /></button>
      </div></div>}
    </div>
  );
}
