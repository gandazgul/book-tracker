import { useEffect, useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { Book, Metadata } from '../../shared/books';
import { getMetadata } from '../lib/metadata';

export default function BookCover({ book }: { book: Book }) {
  const element = useRef<HTMLDivElement>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setMetadata(null);
    setFailed(false);
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      observer.disconnect();
      void getMetadata(book).then(result => { if (active) setMetadata(result); });
    }, { rootMargin: '150px' });
    if (element.current) observer.observe(element.current);
    return () => { active = false; observer.disconnect(); };
  }, [book.title, book.author, book.isbn, book.coverUrl]);
  return <div className="book-cover" ref={element}>
    {metadata?.coverUrl && !failed ? <img src={metadata.coverUrl} alt={`Cover of ${book.title}`} loading="lazy" onError={() => setFailed(true)} />
      : <div className="cover-placeholder"><BookOpen size={24} strokeWidth={1.3} aria-hidden="true" /><span>{book.title.replace(/-\s*\d+$/, '')}</span><small>{book.author || 'Author not listed'}</small></div>}
    {metadata?.sourceUrl && !failed && <a className="cover-source" href={metadata.sourceUrl} target="_blank" rel="noreferrer" aria-label={`View ${book.title} on ${metadata.source}`}>Cover source</a>}
  </div>;
}
