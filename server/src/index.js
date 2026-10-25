import dotenv from 'dotenv';

dotenv.config();

if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret === 'replace-me') {
    throw new Error('Production requires a JWT_SECRET with at least 32 characters.');
  }
}

const { default: app } = await import('./app.js');
const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  console.log(`PeerLearn server listening on ${port}`);
});
