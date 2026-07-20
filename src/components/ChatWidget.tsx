import React, { useState, useEffect } from "react";
import { ChatArea } from "./ChatArea";
import { HomePage } from "./HomePage";
import { useChatStore } from "../store/chatStore";
import type { ChatMessage } from "../store/chatStore";
import { useOnboardingStore } from "../store/onboardingStore";
import { MessageCircle } from "lucide-react"; 

export const ChatWidget: React.FC = () => {
  // Global State
  const { messages, isLoading, sessionId, addMessage, setLoading, startNewSession, fetchHistory } = useChatStore();
  const { 
    userId, complianceFramework, companySize, industry,
    isOnboardingComplete, onboardingStep 
  } = useOnboardingStore();
  // Widget Toggle State
  const [isOpen, setIsOpen] = useState(false);
  const [currentView, setCurrentView] = useState<"home" | "chat">("home");

  // Load history when opening widget
  useEffect(() => {
    if (isOpen && userId) {
      fetchHistory(userId);
    }
  }, [isOpen, userId, fetchHistory]);

  // Switch to chat view if messages load for an existing session
  useEffect(() => {
    if (messages.length > 0) {
      setCurrentView("chat");
    }
  }, [messages.length]);

  const handleNewChat = (prompt?: string) => {
    startNewSession();
    setCurrentView("chat");
    if (prompt) {
      handleSendMessage(prompt);
    }
  };

  const handleBackToHome = () => {
    setCurrentView("home");
    startNewSession(); // Reset so if they click New Chat again it's fresh
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = { 
      id: crypto.randomUUID(), 
      role: "user", 
      content: text,
      timestamp: Date.now()
    };
    
    addMessage(userMsg);

    // --- Onboarding Interceptor ---
    if (!isOnboardingComplete) {
      setTimeout(() => {
        if (onboardingStep === 1) {
          useOnboardingStore.getState().setRole({ user_role: text });
          useOnboardingStore.getState().setOnboardingStep(2);
          addMessage({
            id: crypto.randomUUID(), role: 'system', content: 'Great! Next, tell us about your organization.',
            formType: 'organization', timestamp: Date.now()
          });
        } else if (onboardingStep === 2) {
          try {
            const data = JSON.parse(text);
            useOnboardingStore.getState().setOrganization(data);
            useOnboardingStore.getState().setOnboardingStep(3);
            addMessage({
              id: crypto.randomUUID(), role: 'system', content: 'Awesome. Now, what AI product are you building?',
              formType: 'aiProduct', timestamp: Date.now()
            });
          } catch (e) { /* ignore */ }
        } else if (onboardingStep === 3) {
          try {
            const data = JSON.parse(text);
            useOnboardingStore.getState().setAiProduct(data);
            useOnboardingStore.getState().setOnboardingStep(4);
            addMessage({
              id: crypto.randomUUID(), role: 'system', content: 'Where will this be deployed?',
              formType: 'deployment', timestamp: Date.now()
            });
          } catch (e) { /* ignore */ }
        } else if (onboardingStep === 4) {
          try {
            const data = JSON.parse(text);
            useOnboardingStore.getState().setDeployment(data);
            useOnboardingStore.getState().setOnboardingStep(5);
            addMessage({
              id: crypto.randomUUID(), role: 'system', content: 'Finally, what is your primary goal?',
              options: [
                { id: 'Build a New Compliant AI Product', label: 'Build New AI Product' },
                { id: 'Prepare for SOC 2 Audit', label: 'SOC 2 Readiness' },
                { id: 'Review Security Controls', label: 'Security Review' },
                { id: 'Generate Compliance Documentation', label: 'Docs Generation' }
              ],
              timestamp: Date.now()
            });
          } catch (e) { /* ignore */ }
        } else if (onboardingStep === 5) {
          useOnboardingStore.getState().setGoal({ goal: text });
          useOnboardingStore.getState().setIsOnboardingComplete(true);
          addMessage({
            id: crypto.randomUUID(), role: 'system', content: 'Setup complete! Let me analyze your project now.',
            timestamp: Date.now()
          });
          // Now trigger the actual backend call to analyze
          triggerBackendAnalysis();
        }
      }, 500);
      return;
    }
    // --- End Onboarding Interceptor ---

    triggerBackendCall(text);
  };

  const triggerBackendAnalysis = async () => {
    setLoading(true);
    const msgId = crypto.randomUUID();
    addMessage({ id: msgId, role: "assistant", content: "", timestamp: Date.now() });
    const { complianceFramework, companySize, industry } = useOnboardingStore.getState();
    try {
      const response = await fetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          message: "Analyze my project based on the onboarding data.",
          context: { framework: complianceFramework, company_size: companySize, industry: industry }
        }),
      });
      if (!response.ok) throw new Error("API call failed");
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("No reader");

      let currentText = "";
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.chunk) {
                currentText += data.chunk;
                useChatStore.getState().updateMessage(msgId, { content: currentText });
              }
              if (data.metadata) {
                useChatStore.getState().updateMessage(msgId, {
                  response: data.metadata,
                  options: data.metadata.follow_up_questions ? data.metadata.follow_up_questions.map((q: string) => ({ id: crypto.randomUUID(), label: q })) : undefined
                });
                if (data.metadata.tokens_used) {
                  useChatStore.getState().deductTokens(data.metadata.tokens_used);
                }
              }
            } catch(e) {
              console.error("SSE parse error", e);
            }
          }
        }
      }
      useChatStore.getState().fetchHistory(userId);
    } catch (e) {
      useChatStore.getState().updateMessage(msgId, { content: "### Error\nFailed to receive a response." });
    } finally {
      setLoading(false);
    }
  };

  const triggerBackendCall = async (text: string) => {
    setLoading(true);
    const msgId = crypto.randomUUID();
    addMessage({ id: msgId, role: "assistant", content: "", timestamp: Date.now() });
    try {
      const response = await fetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          message: text,
          context: { framework: complianceFramework, company_size: companySize, industry: industry }
        }),
      });

      if (!response.ok) throw new Error("API call failed");
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      if (!reader) throw new Error("No reader");

      let currentText = "";
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.chunk) {
                currentText += data.chunk;
                useChatStore.getState().updateMessage(msgId, { content: currentText });
              }
              if (data.metadata) {
                useChatStore.getState().updateMessage(msgId, {
                  response: data.metadata,
                  options: data.metadata.follow_up_questions ? data.metadata.follow_up_questions.map((q: string) => ({ id: crypto.randomUUID(), label: q })) : undefined
                });
                if (data.metadata.tokens_used) {
                  useChatStore.getState().deductTokens(data.metadata.tokens_used);
                }
              }
            } catch(e) {
              console.error("SSE parse error", e);
            }
          }
        }
      }
      useChatStore.getState().fetchHistory(userId);
    } catch (e) {
      useChatStore.getState().updateMessage(msgId, { content: "### Error\nFailed to receive a response from the backend." });
    } finally {
      setLoading(false);
    }
  };

  // Start onboarding automatically if empty chat and not complete
  useEffect(() => {
    if (isOpen && currentView === 'chat' && messages.length === 0 && !isOnboardingComplete) {
      setTimeout(() => {
        addMessage({
          id: crypto.randomUUID(),
          role: 'system',
          content: 'Welcome to Albertsons AI! Let\'s get your project set up. What best describes your role?',
          options: [
            { id: 'AI Developer', label: 'AI Developer' },
            { id: 'ML Engineer', label: 'ML Engineer' },
            { id: 'AI Architect', label: 'AI Architect' },
            { id: 'Compliance Manager', label: 'Compliance Manager' },
          ],
          timestamp: Date.now()
        });
      }, 500);
    }
  }, [isOpen, currentView, messages.length, isOnboardingComplete, addMessage]);

  return (
    <>
      {/* Floating Widget Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 bg-[#0055b3] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 transition-transform z-50 group"
        >
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#0055b3] opacity-75 animate-ping"></span>
          <MessageCircle className="h-6 w-6 relative z-10" />
        </button>
      )}

      {/* Chat Widget Container */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[500px] h-[750px] max-h-[85vh] bg-white rounded-2xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.3)] overflow-hidden z-[9999] border border-gray-100 flex flex-col animate-in slide-in-from-bottom-8 fade-in duration-300">
          {currentView === "home" ? (
            <HomePage onNewChat={handleNewChat} onClose={() => setIsOpen(false)} />
          ) : (
            <ChatArea 
              messages={messages} 
              onSendMessage={handleSendMessage} 
              isLoading={isLoading} 
              onClose={() => setIsOpen(false)}
              onBack={handleBackToHome}
            />
          )}
        </div>
      )}
    </>
  );
};
