"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  Settings, 
  Send, 
  Download, 
  Check, 
  AlertCircle, 
  Globe, 
  Phone, 
  MapPin, 
  Users, 
  ExternalLink, 
  MessageSquare,
  Compass,
  Cpu,
  RefreshCw,
  Info
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const DEFAULT_MODELS = [
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nvidia Nemotron 120B (Free)" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet (Paid)" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3" }
];

const QUICK_CHIPS = ["stripe.com", "Tesla", "Microsoft", "OpenAI"];

export default function HomeClient({ initialTab }) {
  // Sidebar config state
  const [activeTab, setActiveTab] = useState(initialTab || "API"); // "API" | "DISCORD"
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [serperKey, setSerperKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("nvidia/nemotron-3-super-120b-a12b:free");
  const [discordToken, setDiscordToken] = useState("");
  const [discordChannelId, setDiscordChannelId] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  
  // Visual Save notifications
  const [saveNotify, setSaveNotify] = useState(false);
  const [discordSaveNotify, setDiscordSaveNotify] = useState(false);

  // App running state
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);
  const [reportId, setReportId] = useState("");
  
  // Discord actions state
  const [sendingDiscord, setSendingDiscord] = useState(false);
  const [sentDiscord, setSentDiscord] = useState(false);
  const [discordError, setDiscordError] = useState("");

  // Load saved configuration from localStorage on mount (only load safe settings like AI model)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedModel = localStorage.getItem("ai_model");
      if (savedModel && DEFAULT_MODELS.some(m => m.id === savedModel)) {
        setSelectedModel(savedModel);
      } else {
        setSelectedModel("nvidia/nemotron-3-super-120b-a12b:free");
      }
    }
  }, []);

  // Save configurations helper (keep keys purely in React memory for current session)
  const saveApiConfig = () => {
    localStorage.setItem("ai_model", selectedModel);
    setSaveNotify(true);
    setTimeout(() => setSaveNotify(false), 2000);
  };

  const saveDiscordConfig = () => {
    setDiscordSaveNotify(true);
    setTimeout(() => setDiscordSaveNotify(false), 2000);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem("active_tab", tab);
    document.cookie = `active_tab=${tab}; path=/; max-age=31536000`;
  };

  // Simulated progressive stepper during research
  const steps = [
    "Resolving company official website via Serper.dev...",
    "Initializing crawler and discovering key links (About, Pricing, Contact)...",
    "Crawling pages and extracting clean structural content...",
    "Gathering business contact details and addresses via search snippets...",
    "Searching Serper.dev for competitor profiles and alternatives...",
    "Compiling dataset and preparing payload for AI reasoning...",
    "Invoking OpenRouter to analyze company summary, offerings, and pain points...",
    "Finalizing competitor reports and creating professional PDF styling..."
  ];

  useEffect(() => {
    let interval;
    if (loading) {
      setCurrentStep(0);
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < steps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 4000); // cycle step every 4s
    } else {
      setCurrentStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Core API calls
  const triggerResearch = async (searchQuery) => {
    const activeQuery = searchQuery || query;
    if (!activeQuery.trim()) {
      setError("Please enter a company name or website URL.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);
    setReportId("");
    setSentDiscord(false);
    setDiscordError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: activeQuery.trim(),
          openrouter_api_key: openRouterKey || undefined,
          serper_api_key: serperKey || undefined,
          ai_model: selectedModel || undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to complete company research.");
      }

      const data = await response.json();
      setReport(data.report);
      setReportId(data.report_id);
    } catch (err) {
      setError(err.message || "An unexpected error occurred during research.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!reportId) return;
    window.open(`${API_BASE_URL}/api/research/${reportId}/pdf`, "_blank");
  };

  const sendDiscordMessage = async () => {
    if (!reportId || !report) return;
    if (!discordToken || !discordChannelId) {
      setDiscordError("Discord Bot Token and Channel ID must be saved in the sidebar first.");
      return;
    }

    setSendingDiscord(true);
    setDiscordError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/discord/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          bot_token: discordToken,
          channel_id: discordChannelId,
          applicant_name: applicantName || undefined,
          applicant_email: applicantEmail || undefined,
          company_name: report.company_name,
          company_website: report.website,
          report_id: reportId
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to send report to Discord.");
      }

      setSentDiscord(true);
    } catch (err) {
      setDiscordError(err.message || "An error occurred while uploading to Discord.");
    } finally {
      setSendingDiscord(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background bg-grid-pattern text-foreground font-sans">
      
      {/* Left Sidebar Configurator */}
      <aside className="w-80 h-full bg-card border-r border-border flex flex-col justify-between shrink-0">
          <div>
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center gap-3">
              <div className="h-9 w-9 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-center">
                <Compass className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-sm leading-tight text-white tracking-wide">Research AI</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold font-mono">Company Intelligence</p>
              </div>
            </div>

            {/* Configuration Tabs */}
            <div className="flex border-b border-border p-2 gap-1 bg-black/20">
              <button 
                onClick={() => handleTabChange("API")}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold tracking-wide transition-all-custom ${
                  activeTab === "API" 
                    ? "bg-accent text-white shadow-sm" 
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                API KEYS
              </button>
              <button 
                onClick={() => handleTabChange("DISCORD")}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold tracking-wide transition-all-custom ${
                  activeTab === "DISCORD" 
                  ? "bg-accent text-white shadow-sm" 
                  : "text-muted-foreground hover:text-white"
                }`}
              >
                DISCORD
              </button>
            </div>

            {/* Config Forms */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] no-scrollbar">
              {activeTab === "API" ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">OpenRouter API Key</label>
                    <input 
                      type="password" 
                      placeholder="sk-or-v1-..."
                      value={openRouterKey}
                      onChange={(e) => setOpenRouterKey(e.target.value)}
                      className="w-full bg-black/40 border border-border rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 transition-all-custom"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Serper.dev API Key</label>
                    <input 
                      type="password" 
                      placeholder="Enter Serper key..."
                      value={serperKey}
                      onChange={(e) => setSerperKey(e.target.value)}
                      className="w-full bg-black/40 border border-border rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 transition-all-custom"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">AI Model Selection</label>
                    <select 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-black/40 border border-border rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 transition-all-custom appearance-none cursor-pointer"
                    >
                      {DEFAULT_MODELS.map((model) => (
                        <option key={model.id} value={model.id} className="bg-card py-1.5 text-xs text-white">
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button 
                    onClick={saveApiConfig}
                  className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs py-2 px-4 rounded-md shadow-md transition-all-custom flex items-center justify-center gap-2 mt-2"
                  >
                    {saveNotify ? <Check className="h-4 w-4 stroke-[3]" /> : <Settings className="h-4 w-4" />}
                    {saveNotify ? "Configuration Saved!" : "Save Configuration"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-md p-3 flex gap-2">
                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Optionally configure Discord to send the generated PDF report automatically to your channel when research completes.
                    </p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Discord Bot Token</label>
                    <input 
                      type="password" 
                      placeholder="Enter Bot token..."
                      value={discordToken}
                      onChange={(e) => setDiscordToken(e.target.value)}
                      className="w-full bg-black/40 border border-border rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 transition-all-custom"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Discord Channel ID</label>
                    <input 
                      type="text" 
                      placeholder="000000000000000000"
                      value={discordChannelId}
                      onChange={(e) => setDiscordChannelId(e.target.value)}
                      className="w-full bg-black/40 border border-border rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 transition-all-custom"
                    />
                  </div>

                  <hr className="border-border/50 my-1" />

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Applicant Name</label>
                    <input 
                      type="text" 
                      placeholder="Your Full Name"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      className="w-full bg-black/40 border border-border rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 transition-all-custom"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Applicant Email</label>
                    <input 
                      type="email" 
                      placeholder="email@example.com"
                      value={applicantEmail}
                      onChange={(e) => setApplicantEmail(e.target.value)}
                      className="w-full bg-black/40 border border-border rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 transition-all-custom"
                    />
                  </div>

                  <button 
                    onClick={saveDiscordConfig}
                    className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-semibold text-xs py-2 px-4 rounded-md shadow-md transition-all-custom flex items-center justify-center gap-2 mt-2"
                  >
                    {discordSaveNotify ? <Check className="h-4 w-4 stroke-[3] text-white" /> : null}
                    {discordSaveNotify ? "Discord Config Saved!" : "Save Discord Config"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Info Box Footer */}
          <div className="p-5 border-t border-border bg-black/30">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">How it works</h4>
            <ol className="text-[10px] text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Submit a company name or website URL.</li>
              <li>Serper.dev resolves & retrieves metadata.</li>
              <li>Crawler extracts core content.</li>
              <li>OpenRouter AI parses & structures reports.</li>
              <li>Download PDF or trigger Discord uploads.</li>
            </ol>
          </div>
        </aside>

      {/* Main Panel Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* API Warning/Notice Header */}
        {(!openRouterKey || !serperKey) && (
          <div className="bg-primary/5 border-b border-border/80 px-6 py-2 flex items-center gap-3 text-xs">
            <AlertCircle className="h-4 w-4 text-primary shrink-0" />
            <p className="text-muted-foreground leading-normal">
              Using server default keys. To override, paste your own API keys in the sidebar configuration.
            </p>
          </div>
        )}

        {/* Scrollable Report Content View */}
        <div className="flex-1 overflow-y-auto p-8 relative flex flex-col items-center">
          
          {/* Default / Initial Greeting State */}
          {!loading && !report && !error && (
            <div className="w-full max-w-2xl flex-grow flex flex-col justify-center items-center py-20 text-center select-none">
              <div className="h-16 w-16 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-center mb-6 shadow-sm">
                <Compass className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-white mb-3">
                Know any company in minutes.
              </h1>
              <p className="text-sm text-muted-foreground max-w-lg mb-10 leading-relaxed">
                Enter a company name or website URL below. We will scan official pages, locate competitor profiles, and construct an AI-powered report instantly.
              </p>

              {/* Suggestion Chips */}
              <div className="flex flex-wrap justify-center gap-2.5">
                {QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setQuery(chip);
                      triggerResearch(chip);
                    }}
                    className="px-4 py-1.5 bg-card hover:bg-accent border border-border text-xs rounded-full cursor-pointer text-muted-foreground hover:text-white transition-all-custom font-medium"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error View State */}
          {!loading && error && (
            <div className="w-full max-w-xl bg-red-950/20 border border-red-900/50 rounded-xl p-6 mt-10 flex gap-4">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Research Failed</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">{error}</p>
                <button
                  onClick={() => triggerResearch()}
                  className="px-3.5 py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-800/80 rounded-md text-xs font-semibold text-white transition-all-custom flex items-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry Request
                </button>
              </div>
            </div>
          )}

          {/* Stepper Loading View State */}
          {loading && (
            <div className="w-full max-w-lg flex-grow flex flex-col justify-center items-center py-20 select-none">
              <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-6" />
              <h3 className="text-lg font-bold text-white mb-2">Analyzing Company Profile</h3>
              <p className="text-xs text-muted-foreground mb-8">This may take up to a minute depending on crawler response times.</p>
              
              {/* Stepper list */}
              <div className="w-full bg-card/50 border border-border rounded-xl p-5 space-y-3.5 shadow-sm">
                {steps.map((step, idx) => {
                  const isActive = idx === currentStep;
                  const isCompleted = idx < currentStep;
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-start gap-3 transition-opacity duration-300 ${
                        isActive ? "opacity-100" : isCompleted ? "opacity-40" : "opacity-20"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0 flex items-center justify-center">
                        {isCompleted ? (
                          <div className="h-4 w-4 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                            <Check className="h-2.5 w-2.5 text-primary stroke-[3]" />
                          </div>
                        ) : isActive ? (
                          <div className="h-4 w-4 rounded-full border border-primary border-t-transparent animate-spin shrink-0" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border border-border shrink-0" />
                        )}
                      </div>
                      <p className={`text-xs ${isActive ? "text-white font-medium" : "text-muted-foreground"}`}>{step}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Research Results View Dashboard */}
          {!loading && report && (
            <div className="w-full max-w-3xl space-y-6 animate-fade-in mb-20">
              
              {/* Top Controls Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                  <span className="text-[10px] text-primary uppercase font-bold tracking-wider font-mono">Company Profile Research</span>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">{report.company_name}</h1>
                </div>
                
                {/* Actions */}
                <div className="flex flex-wrap gap-2.5">
                  {/* Download PDF */}
                  <button 
                    onClick={downloadPdf}
                    className="bg-card hover:bg-accent border border-border text-white text-xs font-semibold py-2 px-4 rounded-md transition-all-custom flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-muted-foreground" />
                    Download PDF Report
                  </button>

                  {/* Send to Discord */}
                  <button 
                    onClick={sendDiscordMessage}
                    disabled={sendingDiscord || sentDiscord}
                    className={`text-xs font-semibold py-2 px-4 rounded-md transition-all-custom flex items-center gap-2 shadow-sm ${
                      sentDiscord 
                        ? "bg-emerald-950/30 border border-emerald-800/80 text-emerald-400" 
                        : "bg-primary text-black hover:bg-primary-hover font-semibold glow-primary-hover cursor-pointer"
                    }`}
                  >
                    {sendingDiscord && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {sentDiscord && <Check className="h-4 w-4 stroke-[3]" />}
                    {!sendingDiscord && !sentDiscord && <MessageSquare className="h-4 w-4" />}
                    {sentDiscord ? "Sent to Discord" : sendingDiscord ? "Uploading..." : "Send to Discord"}
                  </button>
                </div>
              </div>

              {/* Discord upload error message */}
              {discordError && (
                <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-3 text-xs text-red-400 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{discordError}</p>
                </div>
              )}

              {/* Grid 2-Column (Company Meta + Product Pills) */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                
                {/* Meta details list (Left) */}
                <div className="md:col-span-2 bg-card border border-border rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company Information</h3>
                  
                  <div className="space-y-3.5">
                    {/* Website */}
                    <div className="flex items-start gap-3">
                      <Globe className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Website</p>
                        {report.website ? (
                          <a 
                            href={report.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-white hover:text-primary transition-all-custom flex items-center gap-1 min-w-0 break-all"
                          >
                            {report.website.replace(/^https?:\/\//, "")}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <p className="text-xs text-muted-foreground">Not available</p>
                        )}
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Phone Number</p>
                        <p className="text-xs text-white">{report.phone || "Not publicly listed"}</p>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Address</p>
                        <p className="text-xs text-white leading-relaxed">{report.address || "Not publicly listed"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products & Services (Right) */}
                <div className="md:col-span-3 bg-card border border-border rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Products & Services</h3>
                  {report.products_services?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {report.products_services.map((item, idx) => (
                        <span 
                          key={idx}
                          className="bg-accent/40 border border-border text-white text-xs px-3 py-1.5 rounded-full font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-relaxed">No specific products or services could be extracted.</p>
                  )}
                </div>
              </div>

              {/* AI-Generated Pain Points */}
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  AI-Generated Pain Points
                </h3>
                {report.pain_points?.length > 0 ? (
                  <ul className="space-y-3.5">
                    {report.pain_points.map((point, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <span className="h-1.5 w-1.5 bg-primary rounded-full shrink-0 mt-2" />
                        <p className="text-xs text-white leading-relaxed">{point}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">No strategic pain points could be inferred.</p>
                )}
              </div>

              {/* Text Summary */}
              {report.summary && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Analysis Summary</h3>
                  <p className="text-xs text-white leading-relaxed font-normal">{report.summary}</p>
                </div>
              )}

              {/* Competitors List */}
              <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Competitor Profiles
                </h3>
                {report.competitors?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {report.competitors.map((comp, idx) => (
                      <div 
                        key={idx} 
                        className="bg-black/30 border border-border rounded-lg p-4 flex flex-col justify-between hover:border-primary/20 transition-all-custom"
                      >
                        <h4 className="text-sm font-bold text-white mb-1.5">{comp.name}</h4>
                        {comp.website ? (
                          <a 
                            href={comp.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1.5 break-all leading-normal"
                          >
                            {comp.website.replace(/^https?:\/\//, "")}
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Website unknown</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">No direct competitors identified.</p>
                )}
              </div>

              {/* Crawled pages references */}
              {report.pages_crawled?.length > 0 && (
                <div className="text-[10px] text-muted-foreground/60 leading-normal flex items-start gap-1">
                  <Compass className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <p>
                    Sources scanned during crawler pass: {report.pages_crawled.join(", ")}
                  </p>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Bottom ChatGPT style input field bar */}
        <div className="p-6 border-t border-border bg-background/90 backdrop-blur-md flex justify-center shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              triggerResearch();
            }}
            className="w-full max-w-2xl bg-card border border-border rounded-xl p-2 pl-4 flex items-center gap-3 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all-custom"
          >
            <input 
              type="text"
              placeholder="Enter a company name (e.g. Stripe) or website URL (e.g. https://tesla.com)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-white placeholder-muted-foreground focus:outline-none py-1.5 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-primary text-black hover:bg-primary-hover h-8 w-8 rounded-lg flex items-center justify-center transition-all-custom cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

      </main>

    </div>
  );
}
