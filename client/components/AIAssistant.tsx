import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Bot, Send, User, MessageSquare, X, Minimize2, Maximize2, AlertCircle, Paperclip, FileText, X as XIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "../lib/utils";
import { useDropzone } from "react-dropzone";

type RiskLevel = "high" | "medium" | "low" | "none";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    type: string;
    title: string;
    href?: string;
    relevance?: number;
  }>;
  attachments?: Array<{
    name: string;
    size: number;
    type: string;
  }>;
  riskLevel?: RiskLevel;
  timestamp?: Date;
}

export interface AIAssistantConfig {
  apiEndpoint?: string;
  welcomeMessage?: string;
  placeholder?: string;
  suggestedQuestions?: string[];
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  maxFileSize?: number;
  supportedFileTypes?: string[];
  enableFileUpload?: boolean;
  enableRiskDetection?: boolean;
  contextProvider?: () => Record<string, any>;
}

interface AIAssistantProps {
  config?: AIAssistantConfig;
}

const defaultConfig: AIAssistantConfig = {
  apiEndpoint: "/api/chat",
  welcomeMessage: "Hello! I'm your AI assistant. How can I help you today?",
  placeholder: "Ask me anything...",
  suggestedQuestions: [
    "How can you help me?",
    "What can I ask you about?",
    "Tell me more about your capabilities",
  ],
  position: "bottom-right",
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFileTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/png',
    'image/jpeg',
  ],
  enableFileUpload: true,
  enableRiskDetection: false,
  contextProvider: () => ({}),
};

export function AIAssistant({ config: userConfig }: AIAssistantProps) {
  const config = { ...defaultConfig, ...userConfig };

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: config.welcomeMessage!,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: config.supportedFileTypes!.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: config.maxFileSize!,
    multiple: true,
    noClick: true,
    noKeyboard: true,
    onDrop: (acceptedFiles, rejectedFiles) => {
      setUploadError(null);

      if (rejectedFiles.length > 0) {
        const errors = rejectedFiles.map(file => {
          if (file.errors[0]?.code === 'file-too-large') {
            return `${file.file.name}: File too large`;
          } else if (file.errors[0]?.code === 'file-invalid-type') {
            return `${file.file.name}: Unsupported file type`;
          }
          return `${file.file.name}: Upload failed`;
        });
        setUploadError(errors.join(', '));
        return;
      }

      if (acceptedFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...acceptedFiles]);
      }
    },
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Detect risk level from message content
  const detectRiskLevel = (content: string): RiskLevel => {
    if (!config.enableRiskDetection) return 'none';

    const lowerContent = content.toLowerCase();
    const highRiskKeywords = ['critical', 'urgent', 'high risk', 'immediate attention', 'severe'];
    const mediumRiskKeywords = ['medium risk', 'moderate', 'attention required', 'warning'];
    const lowRiskKeywords = ['low risk', 'minor', 'acceptable', 'good'];

    if (highRiskKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'high';
    } else if (mediumRiskKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'medium';
    } else if (lowRiskKeywords.some(keyword => lowerContent.includes(keyword))) {
      return 'low';
    }

    return 'none';
  };

  const getRiskIndicatorStyles = (riskLevel: RiskLevel) => {
    switch (riskLevel) {
      case 'high':
        return {
          bgColor: 'bg-red-600',
          textColor: 'text-red-600',
          borderColor: 'border-red-600',
          label: 'HIGH RISK'
        };
      case 'medium':
        return {
          bgColor: 'bg-amber-500',
          textColor: 'text-amber-500',
          borderColor: 'border-amber-500',
          label: 'MEDIUM RISK'
        };
      case 'low':
        return {
          bgColor: 'bg-green-500',
          textColor: 'text-green-500',
          borderColor: 'border-green-500',
          label: 'LOW RISK'
        };
      default:
        return null;
    }
  };

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          setIsOpen(false);
          setIsMinimized(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen]);

  // Create conversation on mount
  useEffect(() => {
    const createConversation = async () => {
      try {
        const response = await fetch(`${config.apiEndpoint}/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "AI Assistant Chat" }),
        });

        if (!response.ok) throw new Error("Failed to create conversation");

        const data = await response.json();
        setConversationId(data.id);
      } catch (err: any) {
        console.error("[AIAssistant] Error creating conversation:", err);
        setError("Failed to initialize chat. Using offline mode.");
      }
    };

    createConversation();
  }, [config.apiEndpoint]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  // Auto-focus input
  useEffect(() => {
    if (isOpen && !isMinimized && conversationId && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized, conversationId]);

  const handleSend = async (message?: string) => {
    const messageText = message || input;
    if ((!messageText.trim() && uploadedFiles.length === 0) || !conversationId) return;

    const attachments = uploadedFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText || `[Uploaded ${uploadedFiles.length} file(s)]`,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setUploadedFiles([]);
    setUploadError(null);
    setIsTyping(true);
    setError(null);

    const contextData = config.contextProvider!();

    try {
      const response = await fetch(`${config.apiEndpoint}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          content: messageText,
          context: contextData,
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const { messageId } = await response.json();

      const eventSource = new EventSource(
        `${config.apiEndpoint}/stream/${messageId}?context=${encodeURIComponent(JSON.stringify(contextData))}`
      );

      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === "chunk") {
            assistantMessage.content += data.content;

            const detectedRiskLevel = detectRiskLevel(assistantMessage.content);
            if (detectedRiskLevel !== 'none') {
              assistantMessage.riskLevel = detectedRiskLevel;
            }

            setMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];

              if (lastMessage && lastMessage.role === "assistant" && lastMessage.id === assistantMessage.id) {
                newMessages[newMessages.length - 1] = { ...assistantMessage };
              } else {
                newMessages.push({ ...assistantMessage, timestamp: new Date() });
              }

              return newMessages;
            });
          } else if (data.type === "sources") {
            assistantMessage.sources = data.sources;
            setMessages((prev) => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];
              if (lastMessage && lastMessage.role === "assistant" && lastMessage.id === assistantMessage.id) {
                newMessages[newMessages.length - 1] = { ...assistantMessage };
              }
              return newMessages;
            });
          } else if (data.type === "done") {
            setIsTyping(false);
            eventSource.close();
          } else if (data.type === "error") {
            setError(data.message || "An error occurred");
            setIsTyping(false);
            eventSource.close();
          }
        } catch (err) {
          console.error("[AIAssistant] Error parsing SSE data:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("[AIAssistant] EventSource error:", err);
        setError("Connection lost. Please try again.");
        setIsTyping(false);
        eventSource.close();
      };
    } catch (err: any) {
      console.error("[AIAssistant] Error sending message:", err);
      setError(err.message || "Failed to send message. Please try again.");
      setIsTyping(false);
    }
  };

  const getPositionStyles = () => {
    const positions = {
      'bottom-right': { bottom: '1.5rem', right: '1.5rem' },
      'bottom-left': { bottom: '1.5rem', left: '1.5rem' },
      'top-right': { top: '1.5rem', right: '1.5rem' },
      'top-left': { top: '1.5rem', left: '1.5rem' },
    };
    return positions[config.position!];
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        style={{ position: 'fixed', ...getPositionStyles(), zIndex: 50 }}
        size="icon"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <div
        className="animate-in fade-in slide-in-from-bottom-4 duration-300"
        style={{ position: 'fixed', ...getPositionStyles(), zIndex: 50 }}
      >
        <Card className="w-80 shadow-lg">
          <CardHeader className="p-4 cursor-pointer hover:bg-accent" onClick={() => setIsMinimized(false)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm">AI Assistant</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">
                  {messages.length} messages
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom-8 duration-300",
        (isMobile || isFullscreen) && "inset-0"
      )}
      style={(isMobile || isFullscreen) ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50
      } : {
        position: 'fixed',
        ...getPositionStyles(),
        zIndex: 50
      }}
    >
      <Card className={cn(
        "flex flex-col shadow-lg",
        (isMobile || isFullscreen) ? "w-full h-full rounded-none" : "w-96 h-[600px]"
      )}>
        <CardHeader className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">AI Assistant</CardTitle>
              {!conversationId && (
                <Badge variant="secondary" className="text-xs">Offline</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!isMobile && !isFullscreen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
              )}
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={isMobile ? "h-10 w-10" : "h-8 w-8"}
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {messages.map((message) => {
                const riskIndicator = message.riskLevel && message.riskLevel !== 'none'
                  ? getRiskIndicatorStyles(message.riskLevel)
                  : null;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" && "justify-end"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 rounded-full bg-primary p-2">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg px-4 py-2 max-w-[80%]",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                        riskIndicator && `border-l-4 ${riskIndicator.borderColor}`
                      )}
                    >
                      {riskIndicator && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
                          <Badge
                            variant="outline"
                            className={cn("text-xs font-semibold", riskIndicator.textColor, riskIndicator.borderColor)}
                          >
                            {riskIndicator.label}
                          </Badge>
                        </div>
                      )}

                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                "flex items-center gap-2 p-2 rounded text-xs",
                                message.role === "user"
                                  ? "bg-primary-foreground/10"
                                  : "bg-background"
                              )}
                            >
                              <FileText className="h-3 w-3 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{attachment.name}</p>
                                <p className="text-xs opacity-70">{formatFileSize(attachment.size)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs font-semibold mb-1">Sources:</p>
                          {message.sources.map((source, idx) => (
                            <div key={idx} className="text-xs opacity-75">
                              • {source.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="flex-shrink-0 rounded-full bg-muted p-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 rounded-full bg-primary p-2">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div className="rounded-lg px-4 py-2 bg-muted">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3 space-y-2" {...(config.enableFileUpload ? getRootProps() : {})}>
            {config.enableFileUpload && <input {...getInputProps()} />}

            {isDragActive && config.enableFileUpload && (
              <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center border-2 border-dashed border-primary rounded-lg">
                <div className="text-center">
                  <Paperclip className="h-12 w-12 mx-auto mb-2 text-primary" />
                  <p className="text-sm font-medium text-primary">Drop files here to upload</p>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-lg text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{uploadError}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-auto"
                  onClick={() => setUploadError(null)}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <div className="space-y-1">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted rounded-lg text-xs"
                  >
                    <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => removeFile(index)}
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {config.suggestedQuestions && config.suggestedQuestions.length > 0 && messages.length <= 1 && (
              <div className="flex flex-wrap gap-2">
                {config.suggestedQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-auto py-2 px-3"
                    onClick={() => handleSend(question)}
                    disabled={isTyping || !conversationId}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder={config.placeholder}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isTyping && conversationId && handleSend()}
                disabled={isTyping || !conversationId}
                className="flex-1"
                autoComplete="off"
              />
              {config.enableFileUpload && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    open();
                  }}
                  disabled={isTyping || !conversationId}
                  className={cn(
                    isMobile ? "h-12 w-12" : "",
                    uploadedFiles.length > 0 && "border-primary text-primary"
                  )}
                >
                  <Paperclip className="h-4 w-4" />
                  {uploadedFiles.length > 0 && (
                    <Badge
                      variant="default"
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {uploadedFiles.length}
                    </Badge>
                  )}
                </Button>
              )}
              <Button
                onClick={() => handleSend()}
                size="icon"
                disabled={isTyping || !conversationId || (!input.trim() && uploadedFiles.length === 0)}
                className={isMobile ? "h-12 w-12" : ""}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
