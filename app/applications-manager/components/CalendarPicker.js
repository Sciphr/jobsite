// app/applications-manager/components/CalendarPicker.js
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function CalendarPicker({
  duration = 45,
  timezone = "America/Toronto",
  onTimeSlotsChange,
  selectedTimeSlots = [],
  provider = "google", // google, microsoft
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableHours, setAvailableHours] = useState([]);
  const [busyTimes, setBusyTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [monthEvents, setMonthEvents] = useState({});
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [monthCache, setMonthCache] = useState({});
  const [dailyBusyCache, setDailyBusyCache] = useState({});
  const [hoverTimeout, setHoverTimeout] = useState(null);

  // Get provider-specific API endpoints
  const getAPIEndpoints = (provider) => {
    switch (provider) {
      case "microsoft":
        return {
          events: "/api/microsoft/calendar/events",
          busyTimes: "/api/microsoft/calendar/busy-times"
        };
      case "google":
      default:
        return {
          events: "/api/calendar/events", 
          busyTimes: "/api/calendar/busy-times"
        };
    }
  };

  const apiEndpoints = getAPIEndpoints(provider);

  // Clear caches when provider changes
  useEffect(() => {
    setMonthCache({});
    setDailyBusyCache({});
    setMonthEvents({});
    setBusyTimes([]);
    setSelectedDate(null);
  }, [provider]);

  // Get current month's calendar data
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();

  // Load month events when current date changes
  useEffect(() => {
    loadMonthEvents();
  }, [currentDate, timezone]);

  // Load events for the current month with caching
  const loadMonthEvents = async () => {
    const monthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    
    // Check cache first
    if (monthCache[monthKey]) {
      setMonthEvents(monthCache[monthKey]);
      return;
    }

    setLoadingEvents(true);
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      const response = await fetch(apiEndpoints.events, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: startOfMonth.toISOString(),
          endTime: endOfMonth.toISOString(),
          timezone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const events = data.events || {};
        
        // Cache the results
        setMonthCache(prev => ({
          ...prev,
          [monthKey]: events
        }));
        
        setMonthEvents(events);
      } else {
        console.error("Failed to load month events");
        setMonthEvents({});
      }
    } catch (error) {
      console.error("Error loading month events:", error);
      setMonthEvents({});
    } finally {
      setLoadingEvents(false);
    }
  };
  
  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Check if date is in current month
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Check if date is in the past
  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Check if date is selected
  const isSelectedDate = (date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  // Get events for a specific date (memoized)
  const getEventsForDate = useCallback((date) => {
    const dateString = date.toDateString();
    return monthEvents[dateString] || [];
  }, [monthEvents]);

  // Check if date has events (memoized)
  const hasEvents = useCallback((date) => {
    const events = getEventsForDate(date);
    return events.length > 0;
  }, [getEventsForDate]);

  // Format time for display
  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Load busy times for selected date with caching
  const loadBusyTimes = async (date) => {
    const dateKey = date.toDateString();
    
    // Check cache first
    if (dailyBusyCache[dateKey]) {
      setBusyTimes(dailyBusyCache[dateKey]);
      generateAvailableHours(date, dailyBusyCache[dateKey]);
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await fetch(apiEndpoints.busyTimes, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: startOfDay.toISOString(),
          endTime: endOfDay.toISOString(),
          timezone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const busyTimes = data.busyTimes || [];
        
        // Cache the results
        setDailyBusyCache(prev => ({
          ...prev,
          [dateKey]: busyTimes
        }));
        
        setBusyTimes(busyTimes);
        generateAvailableHours(date, busyTimes);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to load calendar data");
        setBusyTimes([]);
        generateAvailableHours(date, []);
      }
    } catch (error) {
      console.error("Error loading busy times:", error);
      setError("Failed to load calendar data");
      setBusyTimes([]);
      generateAvailableHours(date, []);
    } finally {
      setLoading(false);
    }
  };

  // Generate available time slots
  const generateAvailableHours = (date, busyTimes) => {
    const hours = [];
    const startHour = 8; // 8 AM
    const endHour = 18; // 6 PM
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) { // 30-minute slots
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotStart.getMinutes() + duration);
        
        // Skip if slot is in the past
        if (slotStart < new Date()) continue;
        
        // Check if slot conflicts with busy times
        const hasConflict = busyTimes.some(busy => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return (slotStart < busyEnd && slotEnd > busyStart);
        });

        hours.push({
          time: slotStart,
          timeString: slotStart.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
          }),
          available: !hasConflict,
          selected: selectedTimeSlots.some(slot => {
            const slotTime = new Date(`${slot.date}T${slot.time}`);
            return Math.abs(slotTime.getTime() - slotStart.getTime()) < 60000; // Within 1 minute
          })
        });
      }
    }
    
    setAvailableHours(hours);
  };

  // Handle date selection
  const handleDateSelect = (date) => {
    if (isPastDate(date) || !isCurrentMonth(date)) return;
    setSelectedDate(date);
    loadBusyTimes(date);
  };

  // Handle date hover with debouncing
  const handleDateHover = useCallback((date) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    
    const timeout = setTimeout(() => {
      setHoveredDate(date);
    }, 100); // 100ms delay to reduce frequent updates
    
    setHoverTimeout(timeout);
  }, [hoverTimeout]);

  const handleDateLeave = useCallback(() => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setHoveredDate(null);
  }, [hoverTimeout]);

  // Handle time slot selection
  const handleTimeSlotSelect = useCallback((timeSlot) => {
    if (!timeSlot.available) return;
    
    const dateString = timeSlot.time.toISOString().split('T')[0];
    const timeString = timeSlot.timeString;
    
    const newSlot = {
      id: Date.now(),
      date: dateString,
      time: timeString,
    };

    // Check if this time slot is already selected
    const existingIndex = selectedTimeSlots.findIndex(slot => {
      const existingTime = new Date(`${slot.date}T${slot.time}`);
      return Math.abs(existingTime.getTime() - timeSlot.time.getTime()) < 60000;
    });

    let updatedSlots;
    if (existingIndex >= 0) {
      // Remove if already selected
      updatedSlots = selectedTimeSlots.filter((_, index) => index !== existingIndex);
    } else {
      // Add new slot
      updatedSlots = [...selectedTimeSlots, newSlot];
    }
    
    onTimeSlotsChange(updatedSlots);
  }, [selectedTimeSlots, onTimeSlotsChange]);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          {loadingEvents && (
            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-gray-600 border-b border-gray-100">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {days.map((day, index) => {
          const isToday = day.toDateString() === today.toDateString();
          const isPast = isPastDate(day);
          const isCurrent = isCurrentMonth(day);
          const isSelected = isSelectedDate(day);
          const dayHasEvents = hasEvents(day);
          const dayEvents = getEventsForDate(day);
          const isHovered = hoveredDate && hoveredDate.toDateString() === day.toDateString();
          
          return (
            <div key={index} className="relative">
              <button
                onClick={() => handleDateSelect(day)}
                onMouseEnter={() => handleDateHover(day)}
                onMouseLeave={handleDateLeave}
                disabled={isPast || !isCurrent}
                className={`
                  w-full p-2 h-12 text-sm transition-colors relative
                  ${isCurrent ? 'text-gray-900' : 'text-gray-300'}
                  ${isPast ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-50'}
                  ${isSelected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                  ${isToday && !isSelected ? 'bg-blue-100 text-blue-600 font-semibold' : ''}
                `}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span>{day.getDate()}</span>
                  
                  {/* Event indicators */}
                  <div className="flex items-center justify-center space-x-0.5 mt-0.5">
                    {/* Selected time slots indicator */}
                    {selectedTimeSlots.some(slot => {
                      const slotDate = new Date(slot.date);
                      return slotDate.toDateString() === day.toDateString();
                    }) && (
                      <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    )}
                    
                    {/* Calendar events indicators */}
                    {dayHasEvents && isCurrent && (
                      <div className="flex space-x-0.5">
                        {dayEvents.slice(0, 3).map((_, eventIndex) => (
                          <div 
                            key={eventIndex} 
                            className={`w-1 h-1 rounded-full ${
                              isSelected ? 'bg-blue-200' : 'bg-red-400'
                            }`}
                          ></div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className={`text-xs ${isSelected ? 'text-blue-200' : 'text-red-500'}`}>
                            +{dayEvents.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
              
              {/* Hover tooltip showing events */}
              {isHovered && dayHasEvents && isCurrent && !isPast && (
                <div className="absolute top-full left-0 z-10 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    {day.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {dayEvents.slice(0, 5).map((event, eventIndex) => (
                      <div key={eventIndex} className="text-xs p-1 bg-gray-50 rounded">
                        <div className="font-medium text-gray-800 truncate">
                          {event.summary}
                        </div>
                        {!event.isAllDay && (
                          <div className="text-gray-600">
                            {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                          </div>
                        )}
                        {event.isAllDay && (
                          <div className="text-gray-600">All day</div>
                        )}
                      </div>
                    ))}
                    {dayEvents.length > 5 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{dayEvents.length - 5} more events
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time slots panel */}
      {selectedDate && (
        <div className="border-t border-gray-200">
          {/* Events for selected date */}
          {getEventsForDate(selectedDate).length > 0 && (
            <div className="p-4 bg-red-50 border-b border-gray-200">
              <h4 className="font-medium text-red-900 mb-3 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Your Schedule - {selectedDate.toLocaleDateString()}
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {getEventsForDate(selectedDate).map((event, index) => (
                  <div key={index} className="text-sm p-2 bg-white rounded border border-red-200">
                    <div className="font-medium text-gray-900 truncate">
                      {event.summary}
                    </div>
                    <div className="text-gray-600 text-xs">
                      {event.isAllDay ? (
                        'All day'
                      ) : (
                        `${formatTime(event.start.dateTime)} - ${formatTime(event.end.dateTime)}`
                      )}
                    </div>
                    {event.location && (
                      <div className="text-gray-500 text-xs truncate">
                        📍 {event.location}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                Available Times - {selectedDate.toLocaleDateString()}
              </h4>
              {loading && (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              )}
            </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {availableHours.map((slot, index) => (
              <button
                key={index}
                onClick={() => handleTimeSlotSelect(slot)}
                disabled={!slot.available}
                className={`
                  p-2 text-sm rounded-lg border transition-colors
                  ${slot.selected 
                    ? 'bg-green-600 text-white border-green-600' 
                    : slot.available 
                      ? 'border-gray-300 hover:border-blue-500 hover:bg-blue-50' 
                      : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center justify-center space-x-1">
                  {slot.selected && <CheckCircle className="h-3 w-3" />}
                  <span>{slot.timeString}</span>
                </div>
              </button>
            ))}
          </div>

          {availableHours.length === 0 && !loading && (
            <div className="text-center py-6 text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No available time slots for this date</p>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Selected slots summary */}
      {selectedTimeSlots.length > 0 && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <h4 className="font-medium text-gray-900 mb-2">
            Selected Time Slots ({selectedTimeSlots.length})
          </h4>
          <div className="space-y-1">
            {selectedTimeSlots.map((slot, index) => (
              <div key={index} className="flex items-center justify-between text-sm bg-white rounded px-2 py-1">
                <span>
                  {new Date(slot.date).toLocaleDateString()} at {slot.time}
                </span>
                <button
                  onClick={() => {
                    const updatedSlots = selectedTimeSlots.filter((_, i) => i !== index);
                    onTimeSlotsChange(updatedSlots);
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}