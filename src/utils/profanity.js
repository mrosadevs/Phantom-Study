// Username validation with profanity filter
// Blocks slurs, hateful terms, and derogatory language

const BLOCKED_WORDS = [
  // Racial slurs
  'nigger', 'nigga', 'niggas', 'negro', 'coon', 'darkie', 'spic', 'spick',
  'wetback', 'beaner', 'chink', 'gook', 'zipperhead', 'jap', 'kike',
  'hymie', 'heeb', 'raghead', 'towelhead', 'camel jockey', 'redskin',
  'injun', 'squaw', 'halfbreed', 'mulatto', 'pickaninny', 'sambo',
  'uncle tom', 'cracker', 'honky', 'gringo', 'wop', 'dago', 'guinea',
  'polack', 'kraut', 'limey', 'paki',

  // Homophobic slurs
  'faggot', 'fag', 'fags', 'faggots', 'dyke', 'dykes', 'homo', 'homos',
  'queer', 'tranny', 'trannies', 'shemale', 'ladyboy', 'sodomite',

  // Sexist / gendered slurs
  'bitch', 'bitches', 'whore', 'slut', 'sluts', 'cunt', 'cunts',
  'twat', 'skank', 'hoe', 'thot',

  // Ableist slurs
  'retard', 'retarded', 'retards', 'spaz', 'spastic', 'cripple',
  'mongoloid', 'tard',

  // General profanity
  'fuck', 'fucker', 'fuckers', 'fucking', 'motherfucker', 'shit',
  'shithead', 'bullshit', 'asshole', 'assholes', 'bastard', 'bastards',
  'dick', 'dicks', 'dickhead', 'cock', 'cocks', 'cocksucker', 'pussy',
  'piss', 'damn', 'dammit', 'goddamn', 'hell', 'ass', 'arse',
  'bollocks', 'wanker', 'tosser', 'twit', 'prick',

  // Hate / extremism terms
  'nazi', 'nazis', 'hitler', 'kkk', 'jihad', 'isis',

  // Leet speak / evasion common patterns
  'n1gger', 'n1gga', 'f4ggot', 'f4g', 'b1tch', 'sh1t', 'fck', 'fcking',
  'stfu', 'gtfo', 'lmfao',
];

export function containsProfanity(text) {
  const lower = text.toLowerCase().replace(/[^a-z]/g, '');
  return BLOCKED_WORDS.some(word => {
    const clean = word.replace(/[^a-z]/g, '');
    return lower.includes(clean);
  });
}

export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }
  if (!/^[a-zA-Z]+$/.test(trimmed)) {
    return { valid: false, error: 'Letters only — no numbers or special characters' };
  }
  if (containsProfanity(trimmed)) {
    return { valid: false, error: 'That username is not allowed' };
  }
  return { valid: true, error: null };
}
