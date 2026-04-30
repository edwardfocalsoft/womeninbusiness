export default function Footer() {
  return (
    <footer className="border-t border-border py-6 bg-card hidden md:block">
      <div className="container text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Livents · Event & Membership Management Platform
        </p>
        <p className="text-[10px] text-muted-foreground mt-1">
          Powered by <a href="https://www.livents.co.za" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">Livents</a>
        </p>
      </div>
    </footer>
  );
}
