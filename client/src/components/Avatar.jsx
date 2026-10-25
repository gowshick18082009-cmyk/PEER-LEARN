export default function Avatar({ user, className = '' }) {
  const initial = user?.name?.trim().charAt(0).toUpperCase() || '?';

  return (
    <span className={`user-avatar ${className}`.trim()} aria-label={`${user?.name || 'User'} profile photo`}>
      {user?.avatar_data
        ? <img src={user.avatar_data} alt="" />
        : <span aria-hidden="true">{initial}</span>}
    </span>
  );
}
