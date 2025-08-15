"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useThemeClasses } from "@/app/contexts/AdminThemeContext";
import { 
  HelpCircle, 
  Send, 
  Ticket, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  XCircle,
  Loader2,
  MessageSquare,
  Mail,
  User,
  Calendar,
  AlertTriangle,
  ArrowLeft,
  Reply,
  MessageCircle
} from "lucide-react";

export default function SupportTickets() {
  const { data: session } = useSession();
  const { getButtonClasses, getStatCardClasses } = useThemeClasses();
  const [activeTab, setActiveTab] = useState("submit");
  const [tickets, setTickets] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  
  // Ticket detail view state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    category: "technical"
  });

  // Load existing tickets
  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/support/tickets');
      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "tickets") {
      loadTickets();
    }
  }, [activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Support ticket ${data.ticket.ticket_number} submitted successfully!`
        });
        setFormData({
          title: "",
          description: "",
          priority: "medium",
          category: "technical"
        });
        // Refresh tickets if we're viewing them
        if (activeTab === "tickets") {
          loadTickets();
        }
      } else {
        setMessage({
          type: "error",
          text: data.error || 'Failed to submit ticket'
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: 'Network error. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Load messages for a specific ticket
  const loadTicketMessages = async (ticketId) => {
    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setTicketMessages(data.messages || []);
      } else {
        console.error('Failed to load messages');
        setTicketMessages([]);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setTicketMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Open ticket detail view
  const openTicketDetail = (ticket) => {
    setSelectedTicket(ticket);
    loadTicketMessages(ticket.id);
  };

  // Close ticket detail view
  const closeTicketDetail = () => {
    setSelectedTicket(null);
    setTicketMessages([]);
    setReplyMessage("");
  };

  // Send reply to ticket
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;
    
    setIsSendingReply(true);
    try {
      const response = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: replyMessage }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add the new message to the list
        setTicketMessages(prev => [...prev, data.message]);
        setReplyMessage("");
        setMessage({
          type: "success",
          text: "Reply sent successfully!"
        });
        setTimeout(() => setMessage(""), 3000);
      } else {
        const errorData = await response.json();
        setMessage({
          type: "error",
          text: errorData.error || 'Failed to send reply'
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: 'Network error. Please try again.'
      });
    } finally {
      setIsSendingReply(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <AlertCircle className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return <Ticket className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
      case 'in_progress': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300';
      case 'resolved': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      case 'closed': return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // If viewing ticket detail, show that instead
  if (selectedTicket) {
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center space-x-3">
          <button
            onClick={closeTicketDetail}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5 admin-text" />
          </button>
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <MessageCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold admin-text">
              {selectedTicket.title}
            </h3>
            <p className="text-sm admin-text-light">
              Ticket #{selectedTicket.ticket_number}
            </p>
          </div>
        </div>

        {/* Ticket Info */}
        <div className="admin-card p-4 rounded-lg shadow">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full ${getStatusColor(selectedTicket.status)}`}>
              {getStatusIcon(selectedTicket.status)}
              <span className="font-medium capitalize">{selectedTicket.status.replace('_', ' ')}</span>
            </div>
            
            <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium capitalize">{selectedTicket.priority}</span>
            </div>
            
            {selectedTicket.category && (
              <span className="admin-text-light bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full capitalize">
                {selectedTicket.category.replace('_', ' ')}
              </span>
            )}
            
            <div className="flex items-center space-x-1 admin-text-light">
              <Calendar className="h-3 w-3" />
              <span>Created {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="admin-text">{selectedTicket.description}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="admin-card rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h4 className="font-medium admin-text">Conversation</h4>
          </div>
          
          <div className="p-4">
            {isLoadingMessages ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
                <p className="admin-text-light">Loading messages...</p>
              </div>
            ) : ticketMessages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="admin-text-light">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {ticketMessages.map((msg, index) => (
                  <div key={msg.id || index} className={`flex ${msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender_type === 'customer'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100'
                        : 'bg-gray-100 dark:bg-gray-700 admin-text'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">
                          {msg.sender_name}
                        </span>
                        <span className="text-xs opacity-70">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reply Form */}
        <div className="admin-card p-4 rounded-lg shadow">
          {message && (
            <div className={`mb-4 p-3 rounded-lg border ${
              message.type === "success" 
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300" 
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
            }`}>
              <div className="flex items-center space-x-2">
                {message.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSendReply} className="space-y-4">
            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Your Reply
              </label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700 resize-none"
                placeholder="Type your reply here..."
                disabled={isSendingReply}
              />
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSendingReply || !replyMessage.trim()}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 font-medium ${getButtonClasses("accent")} ${
                  isSendingReply || !replyMessage.trim()
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-lg"
                }`}
              >
                {isSendingReply ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Reply className="h-4 w-4" />
                )}
                <span>{isSendingReply ? "Sending..." : "Send Reply"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
          <HelpCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold admin-text">Support Tickets</h3>
          <p className="text-sm admin-text-light">Submit support requests and track existing tickets</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("submit")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md transition-colors duration-200 text-sm font-medium ${
            activeTab === "submit"
              ? "bg-white dark:bg-gray-700 admin-text shadow-sm"
              : "admin-text-light hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Submit Ticket</span>
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md transition-colors duration-200 text-sm font-medium ${
            activeTab === "tickets"
              ? "bg-white dark:bg-gray-700 admin-text shadow-sm"
              : "admin-text-light hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <Ticket className="h-4 w-4" />
          <span>My Tickets</span>
          {tickets.length > 0 && (
            <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full">
              {tickets.length}
            </span>
          )}
        </button>
      </div>

      {/* Submit Ticket Tab */}
      {activeTab === "submit" && (
        <div className="admin-card p-6 rounded-lg shadow">
          {message && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === "success" 
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300" 
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
            }`}>
              <div className="flex items-center space-x-2">
                {message.type === "success" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
                <span className="font-medium">{message.text}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700"
                placeholder="Brief description of the issue"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Priority and Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange("priority", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700"
                  disabled={isSubmitting}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium admin-text mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange("category", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700"
                  disabled={isSubmitting}
                >
                  <option value="technical">Technical Issue</option>
                  <option value="feature_request">Feature Request</option>
                  <option value="bug_report">Bug Report</option>
                  <option value="account_issue">Account Issue</option>
                  <option value="integration">Integration Support</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium admin-text mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 admin-text bg-white dark:bg-gray-700 resize-none"
                placeholder="Please provide detailed information about your issue, including any error messages, steps to reproduce, and expected behavior..."
                required
                disabled={isSubmitting}
              />
              <p className="mt-2 text-xs admin-text-light">
                The more details you provide, the faster we can help resolve your issue.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !formData.title.trim() || !formData.description.trim()}
                className={`flex items-center space-x-2 px-6 py-2 rounded-lg transition-colors duration-200 font-medium ${getButtonClasses("accent")} ${
                  isSubmitting || !formData.title.trim() || !formData.description.trim()
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-lg"
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{isSubmitting ? "Submitting..." : "Submit Ticket"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My Tickets Tab */}
      {activeTab === "tickets" && (
        <div className="admin-card rounded-lg shadow">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
              <p className="admin-text-light">Loading your tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8 text-center">
              <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium admin-text mb-2">No Tickets Yet</h3>
              <p className="admin-text-light mb-4">
                You haven't submitted any support tickets yet.
              </p>
              <button
                onClick={() => setActiveTab("submit")}
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${getButtonClasses("primary")}`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>Submit Your First Ticket</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium admin-text">
                          {ticket.title}
                        </h4>
                        <span className="text-sm font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded">
                          {ticket.ticket_number}
                        </span>
                      </div>
                      
                      <p className="admin-text-light mb-4 line-clamp-2">
                        {ticket.description}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
                          {getStatusIcon(ticket.status)}
                          <span className="font-medium capitalize">{ticket.status.replace('_', ' ')}</span>
                        </div>
                        
                        <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                          <AlertTriangle className="h-3 w-3" />
                          <span className="font-medium capitalize">{ticket.priority}</span>
                        </div>
                        
                        {ticket.category && (
                          <span className="admin-text-light bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full capitalize">
                            {ticket.category.replace('_', ' ')}
                          </span>
                        )}
                        
                        <div className="flex items-center space-x-1 admin-text-light">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0 ml-4">
                      <button
                        onClick={() => openTicketDetail(ticket)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors duration-200 text-sm font-medium ${getButtonClasses("primary")}`}
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>View Messages</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}