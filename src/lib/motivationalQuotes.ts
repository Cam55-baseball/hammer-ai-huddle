interface Quote {
  text: string;
  author: string;
}

const MOTIVATIONAL_QUOTES: Quote[] = [
  // Sports/Athletic Focus
  { text: "Champions are made when no one is watching.", author: "Unknown" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "The only way to prove you are a good sport is to lose.", author: "Ernie Banks" },
  { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { text: "The more you sweat in practice, the less you bleed in battle.", author: "Unknown" },
  { text: "Excellence is not a singular act but a habit.", author: "Aristotle" },
  { text: "The difference between the impossible and possible lies in determination.", author: "Tommy Lasorda" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Talent is God-given. Be humble. Fame is man-given. Be grateful. Conceit is self-given. Be careful.", author: "John Wooden" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is where preparation and opportunity meet.", author: "Bobby Unser" },
  { text: "Push yourself because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream big, work hard, stay focused.", author: "Unknown" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Your only limit is you.", author: "Unknown" },
  { text: "Make each day your masterpiece.", author: "John Wooden" },
  { text: "The will to win is important, but the will to prepare is vital.", author: "Joe Paterno" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "Winning isn't everything, but wanting to win is.", author: "Vince Lombardi" },
  
  // Perseverance/Determination
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { text: "Strength doesn't come from winning. It comes from struggles and hardship.", author: "Arnold Schwarzenegger" },
  { text: "Every champion was once a contender who refused to give up.", author: "Rocky Balboa" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Unknown" },
  { text: "Don't count the days. Make the days count.", author: "Muhammad Ali" },
  { text: "It's not about being better than someone else. It's about being better than you were yesterday.", author: "Unknown" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Never give up on a dream just because of the time it will take to accomplish it.", author: "Unknown" },
  { text: "Obstacles don't have to stop you. If you run into a wall, don't turn around and give up.", author: "Michael Jordan" },
  { text: "The harder the battle, the sweeter the victory.", author: "Unknown" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Challenges are what make life interesting. Overcoming them is what makes life meaningful.", author: "Joshua Marine" },
  { text: "Do not pray for an easy life, pray for the strength to endure a difficult one.", author: "Bruce Lee" },
  { text: "When you feel like quitting, think about why you started.", author: "Unknown" },
  { text: "The comeback is always stronger than the setback.", author: "Unknown" },
  
  // Growth Mindset
  { text: "Every expert was once a beginner.", author: "Unknown" },
  { text: "Progress, not perfection.", author: "Unknown" },
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Small steps in the right direction can be the biggest step of your life.", author: "Unknown" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "A little progress each day adds up to big results.", author: "Unknown" },
  { text: "Don't wish it were easier, wish you were better.", author: "Jim Rohn" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Mistakes are proof that you are trying.", author: "Unknown" },
  { text: "Growth begins at the end of your comfort zone.", author: "Unknown" },
  { text: "Every day is a chance to get better.", author: "Unknown" },
  { text: "Be stronger than your excuses.", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
  { text: "Improvement begins with I.", author: "Arnold H. Glasow" },
  
  // Teamwork/Character
  { text: "A true champion treats others with respect.", author: "Unknown" },
  { text: "Your attitude determines your altitude.", author: "Zig Ziglar" },
  { text: "Individual commitment to a group effort makes a team work.", author: "Vince Lombardi" },
  { text: "Alone we can do so little, together we can do so much.", author: "Helen Keller" },
  { text: "Respect is earned. Honesty is appreciated. Trust is gained. Loyalty is returned.", author: "Unknown" },
  { text: "Character is how you treat those who can do nothing for you.", author: "Unknown" },
  { text: "Good sportsmanship means treating others the way you'd like to be treated.", author: "Unknown" },
  { text: "The strength of the team is each member. The strength of each member is the team.", author: "Phil Jackson" },
  { text: "Coming together is a beginning. Keeping together is progress. Working together is success.", author: "Henry Ford" },
  { text: "There is no 'I' in team, but there is in win.", author: "Michael Jordan" },
  
  // Motivation/Inspiration
  { text: "Today is your opportunity to build the tomorrow you want.", author: "Ken Poirot" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "What you get by achieving your goals is not as important as what you become.", author: "Zig Ziglar" },
  { text: "Limits exist only in the mind.", author: "Unknown" },
  { text: "Your life does not get better by chance, it gets better by change.", author: "Jim Rohn" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "If it doesn't challenge you, it won't change you.", author: "Fred DeVito" },
  { text: "The only person you should try to be better than is the person you were yesterday.", author: "Unknown" },
];

interface QuoteHistory {
  text: string;
  date: string;
}

function hashDateToNumber(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function getQuoteHistory(): QuoteHistory[] {
  const historyStr = localStorage.getItem('quoteHistory');
  if (!historyStr) return [];
  
  try {
    const history: QuoteHistory[] = JSON.parse(historyStr);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    // Filter to only keep last 60 days
    return history.filter(item => new Date(item.date) >= sixtyDaysAgo);
  } catch (e) {
    return [];
  }
}

function saveQuoteToHistory(quote: Quote, date: string): void {
  const history = getQuoteHistory();
  history.push({ text: quote.text, date });
  
  // Keep only last 60 days
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const filtered = history.filter(item => new Date(item.date) >= sixtyDaysAgo);
  
  localStorage.setItem('quoteHistory', JSON.stringify(filtered));
}

export function getDailyQuote(): Quote {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Check if we already have today's quote cached
  const cached = localStorage.getItem('dailyQuote');
  if (cached) {
    try {
      const { date, quote } = JSON.parse(cached);
      if (date === today) return quote;
    } catch (e) {
      // Invalid cache, continue to generate new quote
    }
  }
  
  // Get quote history (last 60 days)
  const history = getQuoteHistory();
  const recentQuoteTexts = new Set(history.map(h => h.text));
  
  // Filter to quotes not used in last 60 days
  const availableQuotes = MOTIVATIONAL_QUOTES.filter(q => !recentQuoteTexts.has(q.text));
  
  // If all quotes have been used recently, reset and use full list
  const quotesToChooseFrom = availableQuotes.length > 0 ? availableQuotes : MOTIVATIONAL_QUOTES;
  
  // Use date-based seed for consistent daily selection
  const seed = hashDateToNumber(today);
  const selectedQuote = quotesToChooseFrom[seed % quotesToChooseFrom.length];
  
  // Save to history and cache
  saveQuoteToHistory(selectedQuote, today);
  localStorage.setItem('dailyQuote', JSON.stringify({ date: today, quote: selectedQuote }));
  
  return selectedQuote;
}
