'use client';

export function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="btn btn-ghost btn-sm" type="submit">Log out</button>
    </form>
  );
}
