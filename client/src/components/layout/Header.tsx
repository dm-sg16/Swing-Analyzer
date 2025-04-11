import { Link } from "wouter";

export default function Header() {
  return (
    <header className="bg-dark text-light shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <span className="material-icons text-secondary mr-2">sports_baseball</span>
          <h1 className="text-xl font-sans font-bold">SwingAnalyzer</h1>
        </div>
        <nav>
          <ul className="flex space-x-6">
            <li><Link href="/" className="hover:text-secondary transition-colors">Home</Link></li>
            <li><Link href="/swings" className="hover:text-secondary transition-colors">My Swings</Link></li>
            <li><Link href="/account" className="text-secondary hover:text-white transition-colors">Account</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
