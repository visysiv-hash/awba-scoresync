import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Download, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const IMAGES = {
  search: "https://media.base44.com/images/public/69c519111fbf9fefe3d69538/e93f5e5d2_generated_image.png",
  scoreEntry: "https://media.base44.com/images/public/69c519111fbf9fefe3d69538/5e1e6a762_generated_image.png",
  results: "https://media.base44.com/images/public/69c519111fbf9fefe3d69538/d3e3e5691_generated_image.png",
  leaderboard: "https://media.base44.com/images/public/69c519111fbf9fefe3d69538/a80ad9935_generated_image.png",
};

const sections = [
  {
    title: "1. Getting Started",
    content: `Open the Score Entry app on your phone or computer. No login is required for basic score entry. You will see two tabs: "Search Games" and "Enter Score".`,
    image: null,
  },
  {
    title: "2. Searching for Your Game",
    content: `Tap the "Search Games" tab. Type your first name (e.g. "Visy") in the search box and tap the search button or press Enter.\n\nA list of your scheduled games will appear. Games already scored show a green "✓ Scored" badge with round scores. Unscored games show "Click to enter scores →".`,
    image: IMAGES.search,
  },
  {
    title: "3. Entering Scores",
    content: `Tap an unscored game from your search results. You'll be taken to the "Enter Score" tab with your game pre-filled.\n\nEnter the score for each round. Invalid scores are highlighted in red. Once all scores are valid, tap "Submit Scores". A confirmation message will appear when saved successfully.`,
    image: IMAGES.scoreEntry,
  },
  {
    title: "4. Viewing Today's Results",
    content: `From the home screen, tap "View Results Dashboard" to see all scores entered today. Each card shows the teams, round-by-round scores, and final totals.`,
    image: IMAGES.results,
  },
  {
    title: "5. League Leaderboard",
    content: `Tap "League Leaderboard" from the home screen. Select a group from the dropdown to see player rankings including wins, losses, games played, and ladder points. You can also search for a specific player to see their match history and performance charts.`,
    image: IMAGES.leaderboard,
  },
  {
    title: "6. Tips",
    content: `• Always search by your own name to find your games quickly.\n• If your game does not appear, check with the desk — the schedule may not be loaded yet.\n• Scores can only be submitted once per game. If there is an error, contact the desk.\n• The app works on any phone or computer — no app download required.`,
    image: null,
  },
];

const loadImageAsDataUrl = (url) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

export default function UserManual() {
  const handleDownloadPDF = async () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 18;
    const maxW = pageW - margin * 2;
    let y = 22;

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Score Entry App — User Manual", margin, y);
    y += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Visy Badminton League", margin, y);
    doc.setTextColor(0);
    y += 8;
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    for (const sec of sections) {
      if (y > 240) { doc.addPage(); y = 20; }

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(sec.title, margin, y);
      y += 6;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(sec.content, maxW);
      for (const line of lines) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 6;
      }
      y += 2;

      if (sec.image) {
        const dataUrl = await loadImageAsDataUrl(sec.image);
        if (dataUrl) {
          const imgW = 80;
          const imgH = 55;
          if (y + imgH > pageH - 20) { doc.addPage(); y = 20; }
          doc.addImage(dataUrl, "PNG", margin, y, imgW, imgH);
          y += imgH + 6;
        }
      }
      y += 4;
    }

    doc.setFontSize(9);
    doc.setTextColor(150);
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.text(`Visy Score Entry App  ·  Page ${i} of ${totalPages}`, margin, 287);
    }

    doc.save("visy-score-entry-user-manual.pdf");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-5 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <button className="text-slate-300 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">User Manual</h1>
              <p className="text-slate-400 text-xs mt-0.5">Visy Score Entry App</p>
            </div>
          </div>
          <Button onClick={handleDownloadPDF} className="gap-2 bg-white text-slate-800 hover:bg-slate-100 text-sm">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-2xl shadow-2xl divide-y divide-slate-100">
          {sections.map((sec, i) => (
            <div key={i} className="px-6 py-6">
              <h2 className="text-base font-bold text-slate-800 mb-2">{sec.title}</h2>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line mb-4">{sec.content}</p>
              {sec.image && (
                <img
                  src={sec.image}
                  alt={sec.title}
                  className="rounded-xl border border-slate-200 shadow-md max-w-xs w-full"
                />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-6 pb-8">
          <Button onClick={handleDownloadPDF} className="gap-2">
            <Download className="w-4 h-4" /> Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}