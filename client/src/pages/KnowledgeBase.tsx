import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, Video, Target, Award } from "lucide-react";

interface Article {
  id: number;
  title: string;
  category: string;
  excerpt: string;
  imageUrl: string;
  slug: string;
}

interface Video {
  id: number;
  title: string;
  duration: string;
  thumbnailUrl: string;
  views: number;
  slug: string;
}

interface Drill {
  id: number;
  title: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  focus: string;
  imageUrl: string;
  slug: string;
}

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("articles");
  
  // Sample data for the knowledge base
  const articles: Article[] = [
    {
      id: 1,
      title: "Understanding the Mechanics of a Perfect Swing",
      category: "Mechanics",
      excerpt: "Learn the fundamentals of proper swing mechanics including stance, grip, and follow-through.",
      imageUrl: "https://placehold.co/600x400/e6f7ff/0078d4.png?text=Swing+Mechanics",
      slug: "understanding-mechanics"
    },
    {
      id: 2,
      title: "Common Mistakes in Baseball Swings",
      category: "Troubleshooting",
      excerpt: "Identify and fix the most common mistakes that players make in their batting stance and swing.",
      imageUrl: "https://placehold.co/600x400/fff5e6/e67700.png?text=Common+Mistakes",
      slug: "common-mistakes"
    },
    {
      id: 3,
      title: "Advanced Bat Control Techniques",
      category: "Advanced",
      excerpt: "Take your hitting to the next level with these advanced techniques for better bat control and precision.",
      imageUrl: "https://placehold.co/600x400/f2e6ff/6200ea.png?text=Bat+Control",
      slug: "bat-control"
    },
    {
      id: 4,
      title: "Mental Approach to Hitting",
      category: "Psychology",
      excerpt: "Develop the mental focus and approach needed to succeed at the plate in high-pressure situations.",
      imageUrl: "https://placehold.co/600x400/e6ffe6/00c853.png?text=Mental+Approach",
      slug: "mental-approach"
    }
  ];
  
  const videos: Video[] = [
    {
      id: 1,
      title: "Pro Swing Breakdown: Mike Trout",
      duration: "10:24",
      thumbnailUrl: "https://placehold.co/600x400/2196f3/fff.png?text=Trout+Breakdown",
      views: 24580,
      slug: "trout-breakdown"
    },
    {
      id: 2,
      title: "Fixing Your Uppercut Swing",
      duration: "7:15",
      thumbnailUrl: "https://placehold.co/600x400/ff5252/fff.png?text=Uppercut+Fix",
      views: 18320,
      slug: "fix-uppercut"
    },
    {
      id: 3,
      title: "Power Hitting: Generating Maximum Force",
      duration: "12:40",
      thumbnailUrl: "https://placehold.co/600x400/ff9800/fff.png?text=Power+Hitting",
      views: 31450,
      slug: "power-hitting"
    },
    {
      id: 4,
      title: "Switch Hitting Fundamentals",
      duration: "9:18",
      thumbnailUrl: "https://placehold.co/600x400/8bc34a/fff.png?text=Switch+Hitting",
      views: 14280,
      slug: "switch-hitting"
    }
  ];
  
  const drills: Drill[] = [
    {
      id: 1,
      title: "Tee Work: Inside vs Outside Pitches",
      difficulty: "beginner",
      focus: "Contact consistency",
      imageUrl: "https://placehold.co/600x400/4caf50/fff.png?text=Tee+Work",
      slug: "tee-work"
    },
    {
      id: 2,
      title: "Soft Toss for Timing",
      difficulty: "beginner",
      focus: "Timing and rhythm",
      imageUrl: "https://placehold.co/600x400/03a9f4/fff.png?text=Soft+Toss",
      slug: "soft-toss"
    },
    {
      id: 3,
      title: "Weighted Bat Swing Progression",
      difficulty: "intermediate",
      focus: "Strength and bat speed",
      imageUrl: "https://placehold.co/600x400/ff5722/fff.png?text=Weighted+Bat",
      slug: "weighted-bat"
    },
    {
      id: 4,
      title: "High Velocity Machine Training",
      difficulty: "advanced",
      focus: "Reaction time and adjustments",
      imageUrl: "https://placehold.co/600x400/9c27b0/fff.png?text=High+Velocity",
      slug: "velocity-training"
    }
  ];
  
  // Filter content based on search query
  const filteredArticles = articles.filter(article => 
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredDrills = drills.filter(drill => 
    drill.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    drill.focus.toLowerCase().includes(searchQuery.toLowerCase()) ||
    drill.difficulty.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Get displayed content based on active tab
  const getDisplayedContent = () => {
    if (searchQuery) {
      switch (activeTab) {
        case "articles":
          return filteredArticles;
        case "videos":
          return filteredVideos;
        case "drills":
          return filteredDrills;
        case "all":
          return {
            articles: filteredArticles,
            videos: filteredVideos,
            drills: filteredDrills
          };
        default:
          return filteredArticles;
      }
    }
    
    switch (activeTab) {
      case "articles":
        return articles;
      case "videos":
        return videos;
      case "drills":
        return drills;
      case "all":
        return {
          articles: articles,
          videos: videos,
          drills: drills
        };
      default:
        return articles;
    }
  };
  
  // Format view count
  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k views`;
    }
    return `${views} views`;
  };
  
  // Render difficulty badge
  const DifficultyBadge = ({ level }: { level: "beginner" | "intermediate" | "advanced" }) => {
    const colorMap = {
      beginner: "bg-green-100 text-green-800",
      intermediate: "bg-yellow-100 text-yellow-800",
      advanced: "bg-red-100 text-red-800"
    };
    
    return (
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${colorMap[level]}`}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </span>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Baseball Knowledge Base</h1>
      </div>
      
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <Input
            className="pl-10 bg-white"
            placeholder="Search for articles, videos, and drills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <Card className="bg-white shadow-md">
        <CardContent className="p-4">
          <Tabs defaultValue="articles" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="articles" className="flex items-center gap-2">
                <BookOpen size={16} />
                Articles
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Video size={16} />
                Videos
              </TabsTrigger>
              <TabsTrigger value="drills" className="flex items-center gap-2">
                <Target size={16} />
                Drills
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Award size={16} />
                All Content
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="articles" className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-700 mb-4">
                Baseball Swing Articles
              </h2>
              
              {filteredArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredArticles.map((article) => (
                    <div key={article.id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-48 overflow-hidden">
                        <img 
                          src={article.imageUrl} 
                          alt={article.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium mb-2">
                          {article.category}
                        </span>
                        <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                        <p className="text-slate-600 text-sm mb-4">{article.excerpt}</p>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/knowledge/articles/${article.slug}`}>Read Article</a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500">No articles found matching your search criteria.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="videos" className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-700 mb-4">
                Swing Analysis Videos
              </h2>
              
              {filteredVideos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredVideos.map((video) => (
                    <div key={video.id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-48 relative overflow-hidden">
                        <img 
                          src={video.thumbnailUrl} 
                          alt={video.title} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white bg-opacity-80 flex items-center justify-center">
                            <span className="material-icons text-primary">play_arrow</span>
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                          {video.duration}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-semibold mb-2">{video.title}</h3>
                        <p className="text-slate-500 text-sm mb-4">{formatViews(video.views)}</p>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/knowledge/videos/${video.slug}`}>Watch Video</a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500">No videos found matching your search criteria.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="drills" className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-700 mb-4">
                Practice Drills for Swing Improvement
              </h2>
              
              {filteredDrills.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredDrills.map((drill) => (
                    <div key={drill.id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-40 overflow-hidden">
                        <img 
                          src={drill.imageUrl} 
                          alt={drill.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-lg font-semibold">{drill.title}</h3>
                          <DifficultyBadge level={drill.difficulty} />
                        </div>
                        <p className="text-slate-600 text-sm mb-4">
                          <strong>Focus:</strong> {drill.focus}
                        </p>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/knowledge/drills/${drill.slug}`}>View Drill</a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500">No drills found matching your search criteria.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="all" className="space-y-8">
              {(filteredArticles.length > 0 || filteredVideos.length > 0 || filteredDrills.length > 0) ? (
                <>
                  {filteredArticles.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-slate-700">Articles</h2>
                        <Button variant="link" size="sm" asChild>
                          <a href="/knowledge?tab=articles">View All</a>
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredArticles.slice(0, 3).map((article) => (
                          <div key={article.id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                            <div className="h-36 overflow-hidden">
                              <img 
                                src={article.imageUrl} 
                                alt={article.title} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="p-3">
                              <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium mb-1">
                                {article.category}
                              </span>
                              <h3 className="text-base font-semibold mb-1">{article.title}</h3>
                              <p className="text-slate-600 text-xs mb-2 line-clamp-2">{article.excerpt}</p>
                              <Button variant="outline" size="sm" asChild>
                                <a href={`/knowledge/articles/${article.slug}`}>Read</a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {filteredVideos.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-slate-700">Videos</h2>
                        <Button variant="link" size="sm" asChild>
                          <a href="/knowledge?tab=videos">View All</a>
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredVideos.slice(0, 3).map((video) => (
                          <div key={video.id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                            <div className="h-36 relative overflow-hidden">
                              <img 
                                src={video.thumbnailUrl} 
                                alt={video.title} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-white bg-opacity-80 flex items-center justify-center">
                                  <span className="material-icons text-sm text-primary">play_arrow</span>
                                </div>
                              </div>
                              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded">
                                {video.duration}
                              </div>
                            </div>
                            <div className="p-3">
                              <h3 className="text-base font-semibold mb-1">{video.title}</h3>
                              <p className="text-slate-500 text-xs mb-2">{formatViews(video.views)}</p>
                              <Button variant="outline" size="sm" asChild>
                                <a href={`/knowledge/videos/${video.slug}`}>Watch</a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {filteredDrills.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-slate-700">Drills</h2>
                        <Button variant="link" size="sm" asChild>
                          <a href="/knowledge?tab=drills">View All</a>
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredDrills.slice(0, 3).map((drill) => (
                          <div key={drill.id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                            <div className="h-32 overflow-hidden">
                              <img 
                                src={drill.imageUrl} 
                                alt={drill.title} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="p-3">
                              <div className="flex justify-between items-center mb-1">
                                <h3 className="text-base font-semibold">{drill.title}</h3>
                                <DifficultyBadge level={drill.difficulty} />
                              </div>
                              <p className="text-slate-600 text-xs mb-2">
                                <strong>Focus:</strong> {drill.focus}
                              </p>
                              <Button variant="outline" size="sm" asChild>
                                <a href={`/knowledge/drills/${drill.slug}`}>View</a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500">No content found matching your search criteria.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}