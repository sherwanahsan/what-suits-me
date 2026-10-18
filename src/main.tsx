import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider, ConvexReactClient, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { skinTones, hairColours, bodyShapes, styles, type StyleResult } from '../convex/styleRules';
import './style.css';

const skinHex = ['#f1d5c5', '#e3b99a', '#c98f64', '#aa704b', '#794b35', '#4c3028'];
function App() {
  const suggest = useAction(api.stylist.suggest);
  const [skinTone, setSkinTone] = useState<(typeof skinTones)[number] | ''>('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<StyleResult | null>(null);
  const resultsRef = useRef<HTMLElement>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!skinTone) { setError('Choose your skin tone to get started.'); return; }
    const form = new FormData(event.currentTarget);
    setError(''); setResult(null); setPending(true);
    try {
      const reply = await suggest({
        skinTone, hairColour: form.get('hairColour') as (typeof hairColours)[number],
        height: Number(form.get('height')), bodyShape: form.get('bodyShape') as (typeof bodyShapes)[number],
        style: form.get('style') as (typeof styles)[number],
      });
      if (reply.ok) { setResult(reply.result); requestAnimationFrame(() => resultsRef.current?.focus()); }
      else setError(reply.message);
    } catch { setError('We couldn’t connect. Check your connection and try again.'); }
    finally { setPending(false); }
  }
  return <>
    <header><a className="wordmark" href="/" aria-label="What suits me home"><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span>What suits me<span className="brand-dot">.</span></a><span className="header-note">A little direction. Your own style.</span></header>
    <main>
      <section className="intro"><h1>Find your kind<br/>of good look.</h1><p>A few details about you. A fresh palette and a few<br className="desktop-break"/> ideas for what to wear next.</p><div className="palette" aria-hidden="true"><span/><span/><span/><span/><span/></div><p className="palette-caption">More you. Less guesswork.</p></section>
      <section className="form-section" aria-labelledby="form-title"><div className="section-heading"><h2 id="form-title">Let’s start with you</h2><p>No photos. No measuring tape needed.</p></div>
        <form onSubmit={submit}>
          <fieldset disabled={pending}><legend>Skin tone</legend><div className="skin-options">{skinTones.map((tone, i) => <label className={`skin-choice ${skinTone === tone ? 'selected' : ''}`} key={tone}><input type="radio" name="skinTone" value={tone} checked={skinTone === tone} onChange={() => { setSkinTone(tone); setError(''); }} required/><span className="skin-swatch" style={{ backgroundColor: skinHex[i] }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10"/></svg></span><span>{tone}</span></label>)}</div></fieldset>
          <div className="form-grid"><label>Hair colour<select name="hairColour" required defaultValue="" disabled={pending}><option value="" disabled>Choose your hair colour</option>{hairColours.map(x => <option key={x}>{x}</option>)}</select></label><label>Height <span className="optional-note">(cm, an estimate is fine)</span><input name="height" type="number" min="80" max="250" step="1" placeholder="e.g. 165" required disabled={pending}/></label></div>
          <label>Body shape<select name="bodyShape" required defaultValue="" disabled={pending}><option value="" disabled>Choose what feels closest</option>{bodyShapes.map(x => <option key={x}>{x}</option>)}</select></label>
          <label>Style you like<select name="style" required defaultValue="" disabled={pending}><option value="" disabled>Choose your everyday style</option>{styles.map(x => <option key={x}>{x}</option>)}</select></label>
          <button className="submit" type="submit" disabled={pending}>{pending ? <><span className="spinner" aria-hidden="true"/>Finding your fit…</> : <>Show me what suits me<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg></>}</button>
          <div aria-live="polite" aria-atomic="true">{pending && <p className="progress">Putting your colours and clothing ideas together…</p>}</div>
          {error && <p className="error" role="alert">{error}</p>}
          <p className="privacy">Your details are sent to AI for this suggestion.<br/>We don’t save your profile or results.</p>
        </form>
      </section>
      <section className={`results ${result ? 'has-results' : ''}`} aria-labelledby="results-title" ref={resultsRef} tabIndex={-1}>
        <div className="results-heading"><h2 id="results-title">{result ? 'A few things to make your own' : 'Your next look starts here'}</h2><p>{result ? 'Ideas to try, with a little why behind each one.' : '5 colours, 3 cuts and 3 clothing ideas, picked for you.'}</p></div>
        {result ? <><h3>Your colours</h3><div className="colour-results">{result.colours.map((item, i) => <article key={i}><div className="result-swatch" style={{ backgroundColor: item.hex }}/><h4>{item.name}</h4><p>{item.reason}</p></article>)}</div><div className="suggestion-columns">{(['cuts', 'clothing'] as const).map(key => <section key={key}><h3>{key === 'cuts' ? 'Cuts to explore' : 'Clothing to try'}</h3>{result[key].map((item, i) => <article className="text-suggestion" key={i}><h4>{item.name}</h4><p>{item.reason}</p></article>)}</section>)}</div><p className="results-note">Style is personal. Keep what feels like you.</p></> : <div className="empty-preview" aria-hidden="true"><div className="mini-palette"><i/><i/><i/><i/><i/></div><span>Colours that click. Clothes that feel right.</span></div>}
      </section>
    </main><footer><span>What suits me.</span><p>A starting point for your wardrobe. You make it yours.</p></footer>
  </>;
}
const url = import.meta.env.VITE_CONVEX_URL;
createRoot(document.getElementById('root')!).render(<React.StrictMode>{url ? <ConvexProvider client={new ConvexReactClient(url)}><App/></ConvexProvider> : <p role="alert">The page isn’t connected yet. Please try again later.</p>}</React.StrictMode>);
