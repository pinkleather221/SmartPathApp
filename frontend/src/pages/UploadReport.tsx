import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Upload, FileText, Plus, X, Loader2 } from "lucide-react";
import { reportsApi } from "@/lib/api";

const grades = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "E"];

const subjects = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Biology",
  "Chemistry",
  "Physics",
  "History",
  "Geography",
  "CRE",
  "Business Studies",
  "Computer Studies",
];

const UploadReport = () => {
  const navigate = useNavigate();
  const [existingReports, setExistingReports] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch existing reports to prevent duplicates
    const loadHistory = async () => {
      try {
        const history = await reportsApi.getHistory();
        if (Array.isArray(history)) {
          const keys = new Set<string>();
          history.forEach((report: any) => {
            if (report.term && report.year) {
              keys.add(`${report.year}-${report.term}`);
            }
          });
          setExistingReports(keys);
        }
      } catch (error) {
        console.error("Failed to load report history:", error);
      }
    };
    loadHistory();
  }, []);

  const availableYears = Array.from({ length: 9 }, (_, i) => (2026 - i).toString());

  const getAvailableTerms = (selectedYear: string) => {
    const allTerms = ["Term 1", "Term 2", "Term 3"];
    if (!selectedYear) return allTerms;
    return allTerms.filter(t => !existingReports.has(`${selectedYear}-${t}`));
  };

  const getAvailableYears = (selectedTerm: string) => {
    if (!selectedTerm) return availableYears;
    return availableYears.filter(y => !existingReports.has(`${y}-${selectedTerm}`));
  };

  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  // OCR results state
  const [ocrResults, setOcrResults] = useState<Record<string, string> | null>(null);
  const [showOcrResults, setShowOcrResults] = useState(false);
  const [ocrMessage, setOcrMessage] = useState("");

  // Manual entry state
  const [term, setTerm] = useState("");
  const [year, setYear] = useState("");
  const [subjectGrades, setSubjectGrades] = useState<
    Array<{ subject: string; grade: string }>
  >([{ subject: "", grade: "" }]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      // Automatically process OCR when file is dropped
      await processOCR(droppedFile);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Automatically process OCR when file is selected
      await processOCR(selectedFile);
    }
  };

  const processOCR = async (fileToProcess: File) => {
    setProcessing(true);
    setShowOcrResults(false);
    setOcrResults(null);

    try {
      toast({
        title: "Processing file...",
        description: "Scanning document and extracting grades",
      });

      const result = await reportsApi.previewOCR(fileToProcess);

      if (result.success && Object.keys(result.grades).length > 0) {
        setOcrResults(result.grades);
        setShowOcrResults(true);
        setOcrMessage(result.message);

        // Convert to subjectGrades format for editing
        const extractedGrades = Object.entries(result.grades).map(([subject, grade]) => ({
          subject,
          grade,
        }));
        setSubjectGrades(extractedGrades.length > 0 ? extractedGrades : [{ subject: "", grade: "" }]);

        toast({
          title: "Grades extracted!",
          description: `Found ${Object.keys(result.grades).length} subjects. Please review below.`,
        });
      } else {
        toast({
          title: "No grades found",
          description: result.message || "Could not extract grades from the file. You can enter them manually below.",
          variant: "destructive",
        });
        setShowOcrResults(false);
      }
    } catch (error) {
      toast({
        title: "OCR processing failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive",
      });
      setShowOcrResults(false);
    } finally {
      setProcessing(false);
    }
  };

  const handleFileUpload = async () => {
    // If we have OCR results, use the edited grades
    if (showOcrResults && subjectGrades.length > 0) {
      return handleConfirmOCR();
    }

    if (!file || !term || !year) {
      toast({
        title: "Error",
        description: "Please select a file, term, and year",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await reportsApi.uploadFile(file, term, parseInt(year));
      toast({
        title: "Report uploaded successfully!",
        description: "Your report is being processed.",
      });
      navigate("/reports");
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload report",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmOCR = async () => {
    if (!term || !year) {
      toast({
        title: "Error",
        description: "Please select term and year",
        variant: "destructive",
      });
      return;
    }

    // Filter out completely empty rows
    const nonEmptyRows = subjectGrades.filter(sg => sg.subject || sg.grade);

    // Check for partially filled rows
    if (nonEmptyRows.some(sg => !sg.subject || !sg.grade)) {
      toast({
        title: "Error",
        description: "Please complete all subject rows or remove empty ones.",
        variant: "destructive",
      });
      return;
    }

    const validSubjects = nonEmptyRows.filter(sg => sg.subject && sg.grade);
    if (validSubjects.length < 7) {
      toast({
        title: "Error",
        description: "You must enter at least 7 subjects to save a report.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const gradesJson: Record<string, string> = {};
      validSubjects.forEach((sg) => { // Use validSubjects here
        gradesJson[sg.subject] = sg.grade;
      });

      await reportsApi.uploadJSON({
        term,
        year: parseInt(year),
        report_date: new Date().toISOString(),
        grades_json: gradesJson,
      });

      toast({
        title: "Report saved successfully!",
        description: "Your grades have been saved.",
        variant: "default",
      });
      navigate("/reports");
    } catch (error) {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to save report",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const addSubjectRow = () => {
    setSubjectGrades([...subjectGrades, { subject: "", grade: "" }]);
  };

  const removeSubjectRow = (index: number) => {
    setSubjectGrades(subjectGrades.filter((_, i) => i !== index));
  };

  const updateSubject = (index: number, field: "subject" | "grade", value: string) => {
    const updated = [...subjectGrades];
    updated[index][field] = value;
    setSubjectGrades(updated);
  };

  const handleManualSubmit = async () => {
    if (!term || !year) {
      toast({
        title: "Error",
        description: "Please select term and year",
        variant: "destructive",
      });
      return;
    }

    // Filter out completely empty rows
    const nonEmptyRows = subjectGrades.filter(sg => sg.subject || sg.grade);

    // Check for partially filled rows
    if (nonEmptyRows.some(sg => !sg.subject || !sg.grade)) {
      toast({
        title: "Error",
        description: "Please complete all subject rows or remove empty ones.",
        variant: "destructive",
      });
      return;
    }

    const validSubjects = nonEmptyRows.filter(sg => sg.subject && sg.grade);
    if (validSubjects.length < 7) {
      toast({
        title: "Error",
        description: "You must enter at least 7 subjects to save a report.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const gradesJson: Record<string, string> = {};
      validSubjects.forEach((sg) => { // Use validSubjects here
        gradesJson[sg.subject] = sg.grade;
      });

      await reportsApi.uploadJSON({
        term,
        year: parseInt(year),
        report_date: new Date().toISOString(),
        grades_json: gradesJson,
      });

      toast({
        title: "Report created successfully!",
        description: "Your grades have been saved.",
      });
      navigate("/reports");
    } catch (error) {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Failed to save report",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Upload Report</h1>
          <p className="text-muted-foreground mt-1">
            Upload a report card or enter grades manually
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">File Upload</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Upload Report Card</CardTitle>
                <CardDescription>
                  Upload a PDF or image of your report card. We'll extract the grades automatically using OCR.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                    }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {file ? (
                    <div className="space-y-4">
                      <FileText className="w-16 h-16 text-primary mx-auto" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      {processing && (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Scanning document...</span>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFile(null);
                          setShowOcrResults(false);
                          setOcrResults(null);
                        }}
                        disabled={processing}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-16 h-16 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-lg font-medium">
                          Drag and drop your report card here
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          or click to browse (PDF, PNG, JPG)
                        </p>
                      </div>
                      <label htmlFor="file-upload">
                        <Button variant="outline" asChild>
                          <span>Browse Files</span>
                        </Button>
                        <input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {showOcrResults && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-start gap-2">
                      <div className="bg-green-500/10 text-green-500 p-2 rounded-full">
                        ✓
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">Grades Extracted</h3>
                        <p className="text-sm text-muted-foreground">{ocrMessage}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="term-ocr">Term</Label>
                        <Select value={term} onValueChange={setTerm}>
                          <SelectTrigger id="term-ocr">
                            <SelectValue placeholder="Select term" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableTerms(year).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="year-ocr">Year</Label>
                        <Select value={year} onValueChange={setYear}>
                          <SelectTrigger id="year-ocr">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableYears(term).map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Review & Edit Grades</Label>
                      {subjectGrades.map((sg, index) => (
                        <div key={index} className="flex gap-2">
                          <Select
                            value={sg.subject}
                            onValueChange={(value) =>
                              updateSubject(index, "subject", value)
                            }
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                              {subjects.map((subject) => (
                                <SelectItem key={subject} value={subject}>
                                  {subject}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={sg.grade}
                            onValueChange={(value) =>
                              updateSubject(index, "grade", value)
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Grade" />
                            </SelectTrigger>
                            <SelectContent>
                              {grades.map((grade) => (
                                <SelectItem key={grade} value={grade}>
                                  {grade}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {subjectGrades.length > 1 && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => removeSubjectRow(index)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        onClick={addSubjectRow}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Subject
                      </Button>
                    </div>

                    <Button
                      onClick={handleConfirmOCR}
                      disabled={uploading || !term || !year}
                      className="w-full"
                      size="lg"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Confirm & Save Report"
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enter Grades Manually</CardTitle>
                <CardDescription>
                  Fill in your grades for each subject
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="term">Term</Label>
                    <Select value={term} onValueChange={setTerm}>
                      <SelectTrigger id="term">
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableTerms(year).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger id="year">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableYears(term).map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Subject Grades</Label>
                  {subjectGrades.map((sg, index) => (
                    <div key={index} className="flex gap-2">
                      <Select
                        value={sg.subject}
                        onValueChange={(value) =>
                          updateSubject(index, "subject", value)
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects
                            .filter(s => s === sg.subject || !subjectGrades.some(other => other.subject === s))
                            .map((subject) => (
                              <SelectItem key={subject} value={subject}>
                                {subject}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={sg.grade}
                        onValueChange={(value) =>
                          updateSubject(index, "grade", value)
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue placeholder="Grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {grades.map((grade) => (
                            <SelectItem key={grade} value={grade}>
                              {grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {subjectGrades.length > 1 && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => removeSubjectRow(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={addSubjectRow}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subject
                  </Button>
                </div>

                <Button
                  onClick={handleManualSubmit}
                  disabled={uploading}
                  className="w-full"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Report"
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div >
    </DashboardLayout >
  );
};

export default UploadReport;
