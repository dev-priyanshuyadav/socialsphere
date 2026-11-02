import Link from 'next/link';
import { createCommunity } from '../actions';

export default function CreateCommunityPage() {
  return <main className="utility-page">
    <header><Link href="/communities">← Communities</Link><h1>Create a community</h1></header>
    <form className="edit-profile-form community-form" action={createCommunity}>
      <label>Name<input name="name" minLength={2} maxLength={80} required /></label>
      <label>Slug<input name="slug" minLength={3} maxLength={48} pattern="[a-z0-9-]+" placeholder="my-community" required /></label>
      <label>Description<textarea name="description" rows={4} maxLength={1000} /></label>
      <label className="checkbox-label"><input type="checkbox" name="is_private" /> Private community</label>
      <button className="utility-button">Create community</button>
    </form>
  </main>;
}
