"use client";

import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Typography } from "@workspace/ui/components/typography";
import { BookOpenText, Copy, Search, X } from "lucide-react";
import { useState, useMemo } from "react";

interface TranscriptViewerProps {
  transcript: string;
  transcriptSource?: string;
  extractedAt?: string;
}

export const TranscriptViewer = ({
  transcript,
  transcriptSource = "unknown",
  extractedAt,
}: TranscriptViewerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedTranscript = useMemo(() => {
    if (!transcript) return [];
    
    // Split transcript by lines and format
    const lines = transcript.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => {
      // Extract timestamp if present (format: [MM:SS] text)
      const timestampMatch = line.match(/^\[(\d{2}:\d{2})\]\s*(.+)$/);
      
      if (timestampMatch) {
        return {
          id: index,
          timestamp: timestampMatch[1],
          text: timestampMatch[2] || '',
          fullLine: line,
        };
      }
      
      return {
        id: index,
        timestamp: null,
        text: line || '',
        fullLine: line,
      };
    });
  }, [transcript]);

  const filteredTranscript = useMemo(() => {
    if (!searchTerm) return formattedTranscript;
    
    const searchLower = searchTerm.toLowerCase();
    return formattedTranscript.filter(entry => 
      entry.text.toLowerCase().includes(searchLower)
    );
  }, [formattedTranscript, searchTerm]);

  const highlightText = (text: string, search: string) => {
    if (!search) return text;
    
    const regex = new RegExp(`(${search})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  const copyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
    } catch (error) {
      console.error('Failed to copy transcript:', error);
    }
  };

  const getSourceBadgeVariant = (source: string) => {
    switch (source) {
      case 'extension':
        return 'default';
      case 'worker':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!transcript) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpenText className="text-primary size-4" />
          <Typography variant="muted">Transcript</Typography>
          <Badge variant={getSourceBadgeVariant(transcriptSource)}>
            {transcriptSource === 'extension' ? 'Chrome Extension' : 
             transcriptSource === 'worker' ? 'API Service' : 
             transcriptSource}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={copyTranscript}>
            <Copy className="size-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <X className="size-4" /> : <Search className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Search functionality */}
      {isExpanded && (
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search transcript..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchTerm && (
            <Typography variant="small" className="mt-2 text-gray-500">
              Found {filteredTranscript.length} matches
            </Typography>
          )}
        </div>
      )}

      {/* Transcript content */}
      <div className="space-y-2">
        {isExpanded ? (
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredTranscript.map((entry) => (
              <div key={entry.id} className="flex gap-3 text-sm">
                {entry.timestamp && (
                  <span className="text-gray-500 font-mono text-xs mt-0.5 shrink-0">
                    {entry.timestamp}
                  </span>
                )}
                <span className="text-gray-700 dark:text-gray-300">
                  {searchTerm ? highlightText(entry.text, searchTerm) : entry.text}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <Typography variant="muted">
              {formattedTranscript.slice(0, 3).map(entry => entry.text).join(' ')}
              {formattedTranscript.length > 3 && '...'}
            </Typography>
            <Button 
              variant="link" 
              size="sm" 
              className="h-auto p-0 mt-2"
              onClick={() => setIsExpanded(true)}
            >
              Show full transcript ({formattedTranscript.length} lines)
            </Button>
          </div>
        )}
      </div>

      {/* Metadata */}
      {extractedAt && (
        <div className="mt-4 pt-4 border-t">
          <Typography variant="small" className="text-gray-500">
            Extracted on {new Date(extractedAt).toLocaleDateString()} at{' '}
            {new Date(extractedAt).toLocaleTimeString()}
          </Typography>
        </div>
      )}
    </Card>
  );
};