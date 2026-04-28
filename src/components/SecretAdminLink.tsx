'use client';

export default function SecretAdminLink() {
  return (
    <span 
      onClick={() => window.location.href = '/admin/login'} 
      className="cursor-default"
    >
      ©
    </span>
  );
}
