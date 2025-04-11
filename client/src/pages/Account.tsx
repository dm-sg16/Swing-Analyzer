import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { User, Settings, Mail, Bell } from "lucide-react";

export default function Account() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  
  // Mock user data
  const userData = {
    name: "John Smith",
    email: "john.smith@example.com",
    username: "johnsmith123",
    avatarUrl: "",
    joined: "April 2025",
    totalSwings: 24,
    avgScore: 7.8
  };
  
  // Handler for saving profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Profile updated",
      description: "Your profile has been successfully updated."
    });
  };
  
  // Handler for saving notification settings
  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Notification preferences saved",
      description: "Your notification settings have been updated."
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <Card className="bg-white shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-col items-center py-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={userData.avatarUrl} alt={userData.name} />
                  <AvatarFallback className="bg-primary text-white text-xl">
                    {userData.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <h2 className="mt-4 text-xl font-semibold">{userData.name}</h2>
                <p className="text-sm text-slate-500">{userData.email}</p>
                <div className="mt-4 text-sm text-slate-500 text-center">
                  <p>Member since {userData.joined}</p>
                  <p>{userData.totalSwings} swings analyzed</p>
                  <p>Average score: {userData.avgScore.toFixed(1)}/10</p>
                </div>
              </div>
              
              <div className="mt-4 space-y-1">
                <Button
                  variant={activeTab === "profile" ? "default" : "ghost"}
                  className="w-full justify-start" 
                  onClick={() => setActiveTab("profile")}
                >
                  <User size={16} className="mr-2" />
                  Profile
                </Button>
                <Button
                  variant={activeTab === "settings" ? "default" : "ghost"}
                  className="w-full justify-start" 
                  onClick={() => setActiveTab("settings")}
                >
                  <Settings size={16} className="mr-2" />
                  Preferences
                </Button>
                <Button
                  variant={activeTab === "notifications" ? "default" : "ghost"}
                  className="w-full justify-start" 
                  onClick={() => setActiveTab("notifications")}
                >
                  <Bell size={16} className="mr-2" />
                  Notifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content */}
        <div className="md:col-span-3">
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle>
                {activeTab === "profile" && "Profile Information"}
                {activeTab === "settings" && "Application Preferences"}
                {activeTab === "notifications" && "Notification Settings"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsContent value="profile" className="mt-0">
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" defaultValue={userData.name} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input id="username" defaultValue={userData.username} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={userData.email} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (optional)</Label>
                        <Input id="phone" type="tel" placeholder="Enter your phone number" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <textarea 
                        id="bio" 
                        className="w-full min-h-[100px] px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Tell us about yourself and your baseball experience..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Profile Photo</Label>
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={userData.avatarUrl} alt={userData.name} />
                          <AvatarFallback className="bg-primary text-white">
                            {userData.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <Button variant="outline" size="sm">
                          Change Photo
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button type="submit">
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </TabsContent>
                
                <TabsContent value="settings" className="mt-0">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Analysis Preferences</h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Focus on Mechanics</p>
                          <p className="text-sm text-slate-500">Emphasize mechanical details in analyses</p>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Focus on Power</p>
                          <p className="text-sm text-slate-500">Evaluate power generation in your swing</p>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Advanced Stats</p>
                          <p className="text-sm text-slate-500">Include advanced metrics in analyses</p>
                        </div>
                        <Switch defaultChecked={false} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Display Settings</h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Dark Mode</p>
                          <p className="text-sm text-slate-500">Switch between light and dark theme</p>
                        </div>
                        <Switch defaultChecked={false} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Auto-play Videos</p>
                          <p className="text-sm text-slate-500">Videos will play automatically when loaded</p>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button>
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="notifications" className="mt-0">
                  <form onSubmit={handleSaveNotifications} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Email Notifications</h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Analysis Completed</p>
                          <p className="text-sm text-slate-500">When your swing analysis is ready</p>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">New Tips & Articles</p>
                          <p className="text-sm text-slate-500">When new content is added to the knowledge base</p>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Progress Updates</p>
                          <p className="text-sm text-slate-500">Weekly updates about your swing improvement</p>
                        </div>
                        <Switch defaultChecked={false} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Application Notifications</h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">In-app Notifications</p>
                          <p className="text-sm text-slate-500">Enable notifications within the application</p>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Browser Notifications</p>
                          <p className="text-sm text-slate-500">Receive notifications when the browser is in background</p>
                        </div>
                        <Switch defaultChecked={false} />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Communication Preferences</h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Marketing Emails</p>
                          <p className="text-sm text-slate-500">Receive promotional emails and offers</p>
                        </div>
                        <Switch defaultChecked={false} />
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <Button type="submit">
                        Save Notification Settings
                      </Button>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}