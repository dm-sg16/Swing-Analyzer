import { Link } from "wouter";

export default function Footer() {
  return (
    <footer className="bg-dark text-light py-4">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <div className="flex items-center">
              <span className="material-icons text-secondary mr-2">sports_baseball</span>
              <h2 className="text-lg font-sans font-bold">SwingAnalyzer</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">AI-powered baseball swing analysis</p>
          </div>
          <div className="flex space-x-6">
            <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">Terms</Link>
            <Link href="/help" className="text-slate-400 hover:text-white transition-colors">Help</Link>
            <Link href="/contact" className="text-slate-400 hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
