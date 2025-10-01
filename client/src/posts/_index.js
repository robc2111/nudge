import aiAccountabilityPartner from './ai-accountability-partner';

const posts = [
  aiAccountabilityPartner,
  // add more posts here
];

// newest first
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

export default posts;
