import type { SeriesCatalog } from '../../shared/series.ts';

// Bibliographic reference data only. Reading history always comes from the live sheet.
// Scope is deliberately explicit: a main-novel lineup does not claim to include novellas,
// companion books, or future releases. Review the linked source before updating this list.
const titles = (...values: string[]) => values.map((title, i) => ({ number: i + 1, title }));
export const seriesCatalog: SeriesCatalog[] = [
  { name: 'Black Tie Billionaires', author: 'Kat Singleton', source: 'https://authorkatsingleton.com/bright-lights-and-summer-nights-book', checkedAt: '2026-10-09', scope: 'Three main novels; the author identifies Bright Lights & Summer Nights as the third and final book.',
    books: titles('Black Ties and White Lies', 'Pretty Rings and Broken Things', 'Bright Lights and Summer Nights') },
  { name: 'Bridgerton', author: 'Julia Quinn', source: 'https://juliaquinn.com/series/bridgertons/', checkedAt: '2026-10-09', scope: 'Eight main novels; companion books and epilogues excluded.',
    books: titles('The Duke and I', 'The Viscount Who Loved Me', 'An Offer from a Gentleman', 'Romancing Mister Bridgerton', 'To Sir Phillip with Love', 'When He Was Wicked', "It’s in His Kiss", 'On the Way to the Wedding') },
  { name: 'Blydon', aliases: ['Splendid Trilogy'], author: 'Julia Quinn', source: 'https://juliaquinn.com/series/splendid/', checkedAt: '2026-10-09', scope: 'Three main novels; A Tale of Two Sisters novella excluded.',
    books: titles('Splendid', 'Dancing at Midnight', 'Minx') },
  { name: 'Simply Quartet', author: 'Mary Balogh', source: 'https://marybalogh.com/series/', checkedAt: '2026-10-09', scope: 'Four main novels.',
    books: titles('Simply Unforgettable', 'Simply Love', 'Simply Magic', 'Simply Perfect') },
  { name: 'Bedwyn Saga', author: 'Mary Balogh', source: 'https://marybalogh.com/series/', checkedAt: '2026-10-09', scope: 'Six main novels; connected prequels and sequels excluded.',
    books: titles('Slightly Married', 'Slightly Wicked', 'Slightly Scandalous', 'Slightly Tempted', 'Slightly Sinful', 'Slightly Dangerous') },
  { name: 'The Hathaways', aliases: ['Hathaways'], author: 'Lisa Kleypas', source: 'https://www.lisakleypas.com/books.html', checkedAt: '2026-10-09', scope: 'Five main novels; bonus stories excluded.',
    books: titles('Mine Till Midnight', 'Seduce Me at Sunrise', 'Tempt Me at Twilight', 'Married by Morning', 'Love in the Afternoon') },
  { name: 'Wallflowers', author: 'Lisa Kleypas', source: 'https://www.lisakleypas.com/books.html', checkedAt: '2026-10-09', scope: 'Four main novels; Again the Magic prequel and A Wallflower Christmas novella excluded.',
    books: titles('Secrets of a Summer Night', 'It Happened One Autumn', 'Devil in Winter', 'Scandal in Spring') },
  { name: 'Spoiler Alert', author: 'Olivia Dade', source: 'https://oliviadade.com/books/', checkedAt: '2026-10-09', scope: 'Three main novels listed by the author.',
    books: titles('Spoiler Alert', 'All the Feels', 'Ship Wrecked') },
  { name: "Harlot's Bay", author: 'Olivia Dade', source: 'https://oliviadade.com/books/', checkedAt: '2026-10-09', scope: 'Two main novels listed as of October 9, 2026; later releases may extend the series.',
    books: titles('At First Spite', 'Second Chance Romance') },
];
