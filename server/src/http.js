export const SUBJECTS = ['math', 'coding', 'languages', 'music', 'design', 'video_editing', 'generative_ai', 'other'];

export function fail(res, message, status = 400) {
  return res.status(status).json({ error: message });
}
