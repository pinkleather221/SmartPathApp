import { useState, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { resourcesApi } from "@/lib/api";
import { Loader2, Plus, Upload, X } from "lucide-react";

const AdminResourceManage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: "",
    grade_level: "",
    type: "pdf", // default
    tags: "",
    content_url: "",
    thumbnail_url: "",
    source: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploading(true);
      try {
        const response = await resourcesApi.upload(file);
        if (response.success) {
          setFormData(prev => ({ ...prev, content_url: response.url }));
          toast({ title: "File uploaded", description: "Resource file ready." });
        }
      } catch (error) {
        toast({ 
          title: "Upload Failed", 
          description: error instanceof Error ? error.message : "Could not upload file", 
          variant: "destructive" 
        });
      } finally {
        setUploading(false);
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic validation
      if (!formData.title || !formData.subject || !formData.grade_level) {
        throw new Error("Please fill in all required fields.");
      }
      
      if (!formData.content_url) {
          throw new Error("Please upload a file or provide a content URL.");
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        subject: formData.subject,
        grade_level: parseInt(formData.grade_level),
        type: formData.type as any,
        tags: formData.tags.split(",").map((t) => t.trim()).filter(Boolean),
        content_url: formData.content_url,
        thumbnail_url: formData.thumbnail_url,
        source: formData.source || "SmartPath Admin",
        is_curated: true,
      };

      await resourcesApi.create(payload);
      toast({
        title: "Success",
        description: "Resource created successfully.",
      });
      // Reset form
      setFormData({
        title: "",
        description: "",
        subject: "",
        grade_level: "",
        type: "pdf",
        tags: "",
        content_url: "",
        thumbnail_url: "",
        source: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create resource",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Manage Resources</h1>
          <p className="text-muted-foreground">Add new educational materials to the library.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add New Resource</CardTitle>
            <CardDescription>Fill in the details below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="e.g. Algebra Fundamentals"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Resource Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) => handleSelectChange("type", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Document</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="note">Notes</SelectItem>
                      <SelectItem value="toolkit">Toolkit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="e.g. Mathematics"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade_level">Grade Level *</Label>
                  <Select
                    value={formData.grade_level}
                    onValueChange={(val) => handleSelectChange("grade_level", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {[9, 10, 11, 12].map((g) => (
                        <SelectItem key={g} value={String(g)}>
                          Grade {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief summary of the resource content..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="e.g. algebra, equations, kcse, revision"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="content_url">Resource File</Label>
                  <div className="flex gap-2">
                    <Input
                        id="content_url"
                        name="content_url"
                        value={formData.content_url}
                        onChange={handleInputChange}
                        placeholder="https://... or upload file"
                        className="flex-1"
                    />
                    <div className="relative">
                        <Button 
                            type="button" 
                            variant="outline" 
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.mp4,.doc,.docx,.jpg,.png"
                        />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload a file (PDF, Video, Image) or paste a direct URL.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thumbnail_url">Thumbnail URL (Optional)</Label>
                  <Input
                    id="thumbnail_url"
                    name="thumbnail_url"
                    value={formData.thumbnail_url}
                    onChange={handleInputChange}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Resource
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminResourceManage;
