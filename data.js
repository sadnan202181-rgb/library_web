// Starting catalog. After the first visit, data lives in the browser's localStorage.
// To change the starting books, edit this list and clear localStorage (or use a new browser).
const CATEGORIES = ["Fictional", "Non-Fictional", "Academic"];

const DEFAULT_BOOKS = [
  // Fictional
  { id: "b1",  title: "Pather Panchali",              author: "Bibhutibhushan Bandyopadhyay", category: "Fictional",     copies: 3 },
  { id: "b2",  title: "Lajja",                        author: "Taslima Nasrin",               category: "Fictional",     copies: 2 },
  { id: "b3",  title: "The Alchemist",                author: "Paulo Coelho",                 category: "Fictional",     copies: 0 },
  { id: "b4",  title: "1984",                         author: "George Orwell",                category: "Fictional",     copies: 4 },
  // Non-Fictional
  { id: "b5",  title: "Wings of Fire",                author: "A. P. J. Abdul Kalam",         category: "Non-Fictional", copies: 2 },
  { id: "b6",  title: "Sapiens",                      author: "Yuval Noah Harari",            category: "Non-Fictional", copies: 0 },
  { id: "b7",  title: "Atomic Habits",                author: "James Clear",                  category: "Non-Fictional", copies: 3 },
  { id: "b8",  title: "Ogni Kanya",                   author: "Muhammad Zafar Iqbal",         category: "Non-Fictional", copies: 1 },
  // Academic
  { id: "b9",  title: "Introduction to Algorithms",   author: "Cormen, Leiserson, Rivest, Stein", category: "Academic",  copies: 2 },
  { id: "b10", title: "Computer Networking: A Top-Down Approach", author: "Kurose & Ross",    category: "Academic",      copies: 0 },
  { id: "b11", title: "Fundamentals of Physics",      author: "Halliday & Resnick",           category: "Academic",      copies: 5 },
  { id: "b12", title: "Database System Concepts",     author: "Silberschatz, Korth, Sudarshan", category: "Academic",    copies: 1 }
];
