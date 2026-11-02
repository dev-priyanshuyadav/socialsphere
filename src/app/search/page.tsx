import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSearchResults } from '@/app/actions/social';

export default async function SearchPage({ searchParams }: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const query = q.trim().slice(0, 80);
  if (!query) {
    return <main className="utility-page"><header><Link href="/">← Home</Link><h1>Search SocialSphere</h1></header><form className="utility-search"><input name="q" placeholder="Search people and public posts" minLength={2} maxLength={80} required /><button>Search</button></form></main>;
  }
  let results;
  try {
    results = await getSearchResults(query);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Sign in')) redirect('/login');
    throw error;
  }

  return (
    <main className="utility-page">
      <header><Link href="/">← Home</Link><h1>Search results</h1></header>
      <form className="utility-search"><input name="q" defaultValue={query} minLength={2} maxLength={80} required /><button>Search</button></form>
      <section className="utility-section"><h2>People</h2>
        {results.people.length ? results.people.map(person => <Link className="utility-person" href={`/u/${person.username}`} key={person.id}>
          <img src={person.avatar_url ?? '/avatar-placeholder.svg'} alt="" /><span><strong>{person.display_name}</strong><small>@{person.username}</small></span><span>View profile</span>
        </Link>) : <p className="utility-empty">No people found.</p>}
      </section>
      <section className="utility-section"><h2>Public posts</h2>
        {results.posts.length ? results.posts.map(post => <article className="utility-post" key={post.id}>
          <Link href={`/u/${post.username}`}>{post.display_name} <small>@{post.username}</small></Link>
          <p>{post.content}</p>
          {post.media_url && (post.media_type === 'video' ? <video src={post.media_url} controls playsInline /> : <img src={post.media_url} alt="Post media" />)}
          <small>{new Date(post.created_at).toLocaleString()}</small>
        </article>) : <p className="utility-empty">No public posts found.</p>}
      </section>
    </main>
  );
}
