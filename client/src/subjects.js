export const SUBJECTS = ['math', 'coding', 'languages', 'music', 'design', 'video_editing', 'generative_ai', 'other'];

export const subjectThemes = {
  math: { label: 'Maths', emoji: '∑', color: '#60a5fa', bg: '#172f55', glow: '#2563eb' },
  coding: { label: 'Coding', emoji: '</>', color: '#34d399', bg: '#123c3a', glow: '#10b981' },
  languages: { label: 'Language', emoji: 'Aa', color: '#fbbf24', bg: '#44351c', glow: '#d97706' },
  music: { label: 'Music', emoji: '♫', color: '#c4b5fd', bg: '#342653', glow: '#8b5cf6' },
  design: { label: 'Design', emoji: '✦', color: '#f9a8d4', bg: '#49243d', glow: '#ec4899' },
  video_editing: { label: 'Video Editing', emoji: '▶', color: '#67e8f9', bg: '#164153', glow: '#06b6d4' },
  generative_ai: { label: 'Generative AI', emoji: '✧', color: '#a5b4fc', bg: '#292e5a', glow: '#6366f1' },
  other: { label: 'Other', emoji: '•', color: '#94a3b8', bg: '#26364d', glow: '#64748b' },
};

export const subjectPages = {
  math: {
    title: 'Maths studio',
    description: 'Build confidence one idea at a time. Work through problems, compare approaches, and learn the reasoning behind every answer.',
    topics: ['Algebra', 'Geometry', 'Statistics', 'Calculus'],
    prompt: 'Find a study partner for your next problem.',
  },
  coding: {
    title: 'Coding lab',
    description: 'Learn by making things. Pair up to explore programming fundamentals, debug tricky logic, and build practical projects.',
    topics: ['JavaScript', 'Python', 'Web development', 'Algorithms'],
    prompt: 'Find a coding partner and start building.',
  },
  music: {
    title: 'Music room',
    description: 'Make space for creative practice. Share an instrument, work on music theory, and grow your sound with peer feedback.',
    topics: ['Guitar', 'Piano', 'Music theory', 'Songwriting'],
    prompt: 'Find someone to practice or create with.',
  },
  design: {
    title: 'Design studio',
    description: 'Turn ideas into thoughtful visuals. Learn design foundations, exchange feedback, and create work with purpose.',
    topics: ['Graphic design', 'UI/UX', 'Illustration', 'Typography'],
    prompt: 'Find a design peer to share ideas with.',
  },
  languages: {
    title: 'Language exchange',
    description: 'Practice a new language in a friendly space. Build fluency through conversation, vocabulary, and everyday expression.',
    topics: ['English', 'Spanish', 'French', 'Conversation'],
    prompt: 'Find a conversation partner and get speaking.',
    tips: [
      'Practice a little every day; short, regular sessions help memory stick.',
      'Say new words aloud and use them in a sentence of your own.',
      'Ask your partner to correct one or two patterns at a time, not every small mistake.',
      'Keep a list of useful phrases and revisit it before each conversation.',
    ],
  },
  video_editing: {
    title: 'Video editing suite',
    description: 'Shape stories with a timeline. Practice pacing, clean cuts, sound, color, and expressive visual choices with fellow creators.',
    topics: ['Editing basics', 'Color grading', 'Audio mixing', 'Motion graphics'],
    prompt: 'Find a creative partner and polish your next edit.',
    tips: [
      'Organize and label footage before you start cutting.',
      'Make a rough cut for story and pacing before adding effects.',
      'Use headphones to check dialogue levels and remove distracting noise.',
      'Keep a copy of the original footage and save versions as you work.',
    ],
  },
  generative_ai: {
    title: 'Generative AI workshop',
    description: 'Explore generative AI thoughtfully. Learn prompt design, evaluate outputs, and build useful workflows while checking for accuracy and bias.',
    topics: ['Prompt design', 'AI fundamentals', 'Image generation', 'Responsible AI'],
    prompt: 'Find a peer to experiment, evaluate, and learn responsibly.',
    tips: [
      'Give prompts a clear goal, useful context, and specific output format.',
      'Treat generated answers as drafts; verify facts with reliable sources.',
      'Never share passwords, private records, or confidential work with AI tools.',
      'Check generated content for bias, attribution needs, and permission before using it.',
    ],
  },
};

subjectPages.math.tips = [
  'Write down what you know and what you need to find before solving.',
  'Show each step so you and your tutor can spot where reasoning changes.',
  'Try explaining why a method works, not only how to use it.',
  'Check your result with a second method or by substituting it back.',
];
subjectPages.coding.tips = [
  'Make the smallest example that reproduces a bug.',
  'Read the exact error message and inspect the line it points to.',
  'Change one thing at a time, then rerun your tests.',
  'Explain your code out loud; unclear logic often reveals the next step.',
];
subjectPages.music.tips = [
  'Warm up slowly before increasing tempo or difficulty.',
  'Practice a short passage in small sections, then join the sections together.',
  'Use a metronome to build steady timing and increase speed gradually.',
  'Record a short practice take to notice progress and areas to improve.',
];
subjectPages.design.tips = [
  'Start with the audience and goal before choosing colors or decoration.',
  'Create a few rough variations before committing to one direction.',
  'Check contrast and text size at the dimensions where the design will be used.',
  'Ask for feedback about a specific question, then iterate deliberately.',
];

export function themeVars(subject) {
  const theme = subjectThemes[subject] || subjectThemes.other;
  return {
    '--accent': theme.color,
    '--subject-accent': theme.color,
    '--subject-glow': theme.glow,
    '--tag-bg': theme.bg,
    '--tag-color': theme.color,
  };
}
