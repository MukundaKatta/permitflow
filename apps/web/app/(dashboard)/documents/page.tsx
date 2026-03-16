"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Upload,
  Download,
  Loader2,
  FileCheck,
  Trash2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { Document } from "@permitflow/supabase";

const DOC_TYPE_LABELS: Record<string, string> = {
  application_form: "Application Form",
  supporting_document: "Supporting Document",
  certificate: "Certificate",
  license: "License",
  inspection_report: "Inspection Report",
  correspondence: "Correspondence",
  receipt: "Receipt",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org) return;

    const { data } = await supabase
      .from("documents")
      .select("*")
      .eq("organization_id", org.id)
      .order("created_at", { ascending: false });

    setDocuments((data as Document[]) || []);
    setLoading(false);
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!org) { setUploading(false); return; }

    for (const file of Array.from(files)) {
      const storagePath = `${org.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      await supabase.from("documents").insert({
        organization_id: org.id,
        name: file.name,
        document_type: "supporting_document",
        storage_path: storagePath,
        mime_type: file.type,
        size_bytes: file.size,
        uploaded_by: user.id,
        is_auto_filled: false,
      });
    }

    await loadDocuments();
    setUploading(false);
    event.target.value = "";
  }

  async function handleDownload(doc: Document) {
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 300);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  }

  async function handleDelete(doc: Document) {
    if (!confirm(`Delete "${doc.name}"?`)) return;

    await supabase.storage.from("documents").remove([doc.storage_path]);
    await supabase.from("documents").delete().eq("id", doc.id);
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Upload, manage, and auto-fill permit application documents.
          </p>
        </div>

        <div>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleUpload}
          />
          <Button asChild disabled={uploading}>
            <label htmlFor="file-upload" className="cursor-pointer">
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload Document
            </label>
          </Button>
        </div>
      </div>

      {/* Auto-filled documents */}
      {documents.filter((d) => d.is_auto_filled).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck className="h-5 w-5 text-primary" />
              Auto-Filled Applications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {documents
              .filter((d) => d.is_auto_filled)
              .map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOC_TYPE_LABELS[doc.document_type] || doc.document_type} - Auto-filled on {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Auto-filled</Badge>
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* All documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOC_TYPE_LABELS[doc.document_type] || doc.document_type} - {formatFileSize(doc.size_bytes)} - {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No documents yet</p>
              <p className="text-sm text-muted-foreground">
                Upload documents or auto-fill permit applications from the permits page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
