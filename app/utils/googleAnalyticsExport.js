import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export const exportGoogleAnalyticsToExcel = (analyticsData, timeRange) => {
  const workbook = XLSX.utils.book_new();
  
  // Get current date for filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  
  // Overview metrics sheet
  const overviewData = [
    ['Google Analytics Report', '', ''],
    ['Generated:', `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, ''],
    ['Time Range:', getTimeRangeLabel(timeRange), ''],
    ['', '', ''],
    ['KEY METRICS:', '', ''],
    ['Active Users:', analyticsData.overview?.activeUsers || 0, ''],
    ['Sessions:', analyticsData.overview?.sessions || 0, ''],
    ['Page Views:', analyticsData.overview?.pageViews || 0, ''],
    ['Bounce Rate:', `${((analyticsData.overview?.bounceRate || 0) * 100).toFixed(2)}%`, ''],
    ['Avg. Session Duration (seconds):', analyticsData.overview?.averageSessionDuration || 0, ''],
    ['Total Job Page Views:', analyticsData.overview?.totalJobPageViews || 0, ''],
    ['Avg. Job Page Bounce Rate:', `${((analyticsData.overview?.avgJobPageBounceRate || 0) * 100).toFixed(2)}%`, ''],
    ['', '', ''],
    ['TOP INSIGHTS:', '', ''],
    ['Most Viewed Page:', analyticsData.insights?.mostViewedPage || 'N/A', ''],
    ['Top Job Page:', analyticsData.insights?.topJobPage || 'N/A', ''],
    ['Top Country:', analyticsData.insights?.topCountry || 'N/A', ''],
    ['Top Device:', analyticsData.insights?.topDevice || 'N/A', ''],
    ['Peak Hour:', `${analyticsData.insights?.peakHour || 0}:00`, ''],
    ['Job Pages Percentage:', `${analyticsData.insights?.jobPagesPercentage || 0}%`, ''],
    ['Top Traffic Source:', analyticsData.insights?.topTrafficSource || 'N/A', ''],
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  overviewSheet['!cols'] = [
    { width: 25 },
    { width: 25 },
    { width: 15 }
  ];
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

  // Traffic Sources sheet
  if (analyticsData.trafficSources && analyticsData.trafficSources.length > 0) {
    const trafficSourcesData = analyticsData.trafficSources.map((source, index) => ({
      'Rank': index + 1,
      'Source': source.source,
      'Sessions': source.sessions,
      'Percentage': `${(source.percentage * 100).toFixed(2)}%`,
      'Users': source.users || 0,
      'Page Views': source.pageViews || 0,
      'Bounce Rate': source.bounceRate ? `${(source.bounceRate * 100).toFixed(2)}%` : 'N/A'
    }));

    const trafficSourcesSheet = XLSX.utils.json_to_sheet(trafficSourcesData);
    trafficSourcesSheet['!cols'] = [
      { width: 8 },
      { width: 20 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, trafficSourcesSheet, 'Traffic Sources');
  }

  // Page Performance sheet
  if (analyticsData.pagePerformance && analyticsData.pagePerformance.length > 0) {
    const pagePerformanceData = analyticsData.pagePerformance.map((page, index) => ({
      'Rank': index + 1,
      'Page Path': page.pagePath,
      'Page Views': page.pageViews,
      'Unique Page Views': page.uniquePageViews || 0,
      'Avg. Time on Page': page.avgTimeOnPage ? `${Math.round(page.avgTimeOnPage)}s` : 'N/A',
      'Bounce Rate': page.bounceRate ? `${(page.bounceRate * 100).toFixed(2)}%` : 'N/A',
      'Exit Rate': page.exitRate ? `${(page.exitRate * 100).toFixed(2)}%` : 'N/A'
    }));

    const pagePerformanceSheet = XLSX.utils.json_to_sheet(pagePerformanceData);
    pagePerformanceSheet['!cols'] = [
      { width: 8 },
      { width: 40 },
      { width: 12 },
      { width: 18 },
      { width: 18 },
      { width: 12 },
      { width: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, pagePerformanceSheet, 'Page Performance');
  }

  // User Demographics sheet
  if (analyticsData.demographics) {
    const demographicsData = [
      ['DEMOGRAPHICS DATA', '', ''],
      ['', '', ''],
      ['TOP COUNTRIES:', '', ''],
      ['Country', 'Sessions', 'Percentage'],
    ];

    if (analyticsData.demographics.countries) {
      analyticsData.demographics.countries.forEach((country, index) => {
        demographicsData.push([
          country.country,
          country.sessions,
          `${(country.percentage * 100).toFixed(2)}%`
        ]);
      });
    }

    demographicsData.push(['', '', '']);
    demographicsData.push(['TOP CITIES:', '', '']);
    demographicsData.push(['City', 'Sessions', 'Percentage']);

    if (analyticsData.demographics.cities) {
      analyticsData.demographics.cities.forEach((city, index) => {
        demographicsData.push([
          city.city,
          city.sessions,
          `${(city.percentage * 100).toFixed(2)}%`
        ]);
      });
    }

    const demographicsSheet = XLSX.utils.aoa_to_sheet(demographicsData);
    demographicsSheet['!cols'] = [
      { width: 20 },
      { width: 12 },
      { width: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, demographicsSheet, 'Demographics');
  }

  // Device & Technology sheet
  if (analyticsData.technology) {
    const technologyData = [
      ['DEVICE & TECHNOLOGY DATA', '', ''],
      ['', '', ''],
      ['DEVICES:', '', ''],
      ['Device Category', 'Sessions', 'Percentage'],
    ];

    if (analyticsData.technology.devices) {
      analyticsData.technology.devices.forEach((device) => {
        technologyData.push([
          device.deviceCategory,
          device.sessions,
          `${(device.percentage * 100).toFixed(2)}%`
        ]);
      });
    }

    technologyData.push(['', '', '']);
    technologyData.push(['BROWSERS:', '', '']);
    technologyData.push(['Browser', 'Sessions', 'Percentage']);

    if (analyticsData.technology.browsers) {
      analyticsData.technology.browsers.forEach((browser) => {
        technologyData.push([
          browser.browser,
          browser.sessions,
          `${(browser.percentage * 100).toFixed(2)}%`
        ]);
      });
    }

    technologyData.push(['', '', '']);
    technologyData.push(['OPERATING SYSTEMS:', '', '']);
    technologyData.push(['Operating System', 'Sessions', 'Percentage']);

    if (analyticsData.technology.operatingSystems) {
      analyticsData.technology.operatingSystems.forEach((os) => {
        technologyData.push([
          os.operatingSystem,
          os.sessions,
          `${(os.percentage * 100).toFixed(2)}%`
        ]);
      });
    }

    const technologySheet = XLSX.utils.aoa_to_sheet(technologyData);
    technologySheet['!cols'] = [
      { width: 25 },
      { width: 12 },
      { width: 12 }
    ];
    XLSX.utils.book_append_sheet(workbook, technologySheet, 'Technology');
  }

  // Realtime Data sheet (if available)
  if (analyticsData.realtime) {
    const realtimeData = [
      ['REALTIME ANALYTICS', '', ''],
      ['Generated:', `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, ''],
      ['', '', ''],
      ['Active Users Right Now:', analyticsData.realtime.activeUsers || 0, ''],
      ['Sessions in Last 30 Minutes:', analyticsData.realtime.sessionsLast30Min || 0, ''],
      ['Page Views in Last 30 Minutes:', analyticsData.realtime.pageViewsLast30Min || 0, ''],
      ['', '', ''],
      ['TOP ACTIVE PAGES:', '', ''],
      ['Page', 'Active Users', ''],
    ];

    if (analyticsData.realtime.topActivePages) {
      analyticsData.realtime.topActivePages.forEach((page) => {
        realtimeData.push([
          page.pagePath,
          page.activeUsers,
          ''
        ]);
      });
    }

    const realtimeSheet = XLSX.utils.aoa_to_sheet(realtimeData);
    realtimeSheet['!cols'] = [
      { width: 40 },
      { width: 15 },
      { width: 15 }
    ];
    XLSX.utils.book_append_sheet(workbook, realtimeSheet, 'Realtime');
  }

  // Generate filename
  const filename = `google_analytics_export_${dateStr}_${timeStr}_${timeRange}.xlsx`;

  // Export the file
  XLSX.writeFile(workbook, filename);
  
  return filename;
};

export const exportGoogleAnalyticsToCSV = (analyticsData, timeRange) => {
  // Create a comprehensive CSV with all Google Analytics data
  const csvData = [
    // Header
    [`Google Analytics Export - ${getTimeRangeLabel(timeRange)}`, '', '', '', ''],
    [`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, '', '', '', ''],
    ['', '', '', '', ''],
    
    // Overview metrics
    ['OVERVIEW METRICS', '', '', '', ''],
    ['Metric', 'Value', '', '', ''],
    ['Active Users', analyticsData.overview?.activeUsers || 0, '', '', ''],
    ['Sessions', analyticsData.overview?.sessions || 0, '', '', ''],
    ['Page Views', analyticsData.overview?.pageViews || 0, '', '', ''],
    ['Bounce Rate', `${((analyticsData.overview?.bounceRate || 0) * 100).toFixed(2)}%`, '', '', ''],
    ['Avg. Session Duration (seconds)', analyticsData.overview?.averageSessionDuration || 0, '', '', ''],
    ['Total Job Page Views', analyticsData.overview?.totalJobPageViews || 0, '', '', ''],
    ['Avg. Job Page Bounce Rate', `${((analyticsData.overview?.avgJobPageBounceRate || 0) * 100).toFixed(2)}%`, '', '', ''],
    ['', '', '', '', ''],
    
    // Key insights
    ['KEY INSIGHTS', '', '', '', ''],
    ['Most Viewed Page', analyticsData.insights?.mostViewedPage || 'N/A', '', '', ''],
    ['Top Job Page', analyticsData.insights?.topJobPage || 'N/A', '', '', ''],
    ['Top Country', analyticsData.insights?.topCountry || 'N/A', '', '', ''],
    ['Top Device', analyticsData.insights?.topDevice || 'N/A', '', '', ''],
    ['Peak Hour', `${analyticsData.insights?.peakHour || 0}:00`, '', '', ''],
    ['Job Pages Percentage', `${analyticsData.insights?.jobPagesPercentage || 0}%`, '', '', ''],
    ['Top Traffic Source', analyticsData.insights?.topTrafficSource || 'N/A', '', '', ''],
    ['', '', '', '', ''],
    
    // Traffic sources
    ['TRAFFIC SOURCES', '', '', '', ''],
    ['Source', 'Sessions', 'Percentage', 'Users', 'Page Views'],
  ];

  if (analyticsData.trafficSources) {
    analyticsData.trafficSources.forEach((source) => {
      csvData.push([
        source.source,
        source.sessions,
        `${(source.percentage * 100).toFixed(2)}%`,
        source.users || 0,
        source.pageViews || 0
      ]);
    });
  }

  csvData.push(['', '', '', '', '']);

  // Page performance
  if (analyticsData.pagePerformance) {
    csvData.push(['PAGE PERFORMANCE', '', '', '', '']);
    csvData.push(['Page Path', 'Page Views', 'Unique Views', 'Avg. Time on Page', 'Bounce Rate']);
    
    analyticsData.pagePerformance.forEach((page) => {
      csvData.push([
        page.pagePath,
        page.pageViews,
        page.uniquePageViews || 0,
        page.avgTimeOnPage ? `${Math.round(page.avgTimeOnPage)}s` : 'N/A',
        page.bounceRate ? `${(page.bounceRate * 100).toFixed(2)}%` : 'N/A'
      ]);
    });
    
    csvData.push(['', '', '', '', '']);
  }

  // Demographics
  if (analyticsData.demographics) {
    csvData.push(['DEMOGRAPHICS - COUNTRIES', '', '', '', '']);
    csvData.push(['Country', 'Sessions', 'Percentage', '', '']);
    
    if (analyticsData.demographics.countries) {
      analyticsData.demographics.countries.forEach((country) => {
        csvData.push([
          country.country,
          country.sessions,
          `${(country.percentage * 100).toFixed(2)}%`,
          '',
          ''
        ]);
      });
    }
    
    csvData.push(['', '', '', '', '']);
    csvData.push(['DEMOGRAPHICS - CITIES', '', '', '', '']);
    csvData.push(['City', 'Sessions', 'Percentage', '', '']);
    
    if (analyticsData.demographics.cities) {
      analyticsData.demographics.cities.forEach((city) => {
        csvData.push([
          city.city,
          city.sessions,
          `${(city.percentage * 100).toFixed(2)}%`,
          '',
          ''
        ]);
      });
    }
    
    csvData.push(['', '', '', '', '']);
  }

  // Technology
  if (analyticsData.technology) {
    csvData.push(['TECHNOLOGY - DEVICES', '', '', '', '']);
    csvData.push(['Device Category', 'Sessions', 'Percentage', '', '']);
    
    if (analyticsData.technology.devices) {
      analyticsData.technology.devices.forEach((device) => {
        csvData.push([
          device.deviceCategory,
          device.sessions,
          `${(device.percentage * 100).toFixed(2)}%`,
          '',
          ''
        ]);
      });
    }
    
    csvData.push(['', '', '', '', '']);
    csvData.push(['TECHNOLOGY - BROWSERS', '', '', '', '']);
    csvData.push(['Browser', 'Sessions', 'Percentage', '', '']);
    
    if (analyticsData.technology.browsers) {
      analyticsData.technology.browsers.forEach((browser) => {
        csvData.push([
          browser.browser,
          browser.sessions,
          `${(browser.percentage * 100).toFixed(2)}%`,
          '',
          ''
        ]);
      });
    }
    
    csvData.push(['', '', '', '', '']);
    csvData.push(['TECHNOLOGY - OPERATING SYSTEMS', '', '', '', '']);
    csvData.push(['Operating System', 'Sessions', 'Percentage', '', '']);
    
    if (analyticsData.technology.operatingSystems) {
      analyticsData.technology.operatingSystems.forEach((os) => {
        csvData.push([
          os.operatingSystem,
          os.sessions,
          `${(os.percentage * 100).toFixed(2)}%`,
          '',
          ''
        ]);
      });
    }
  }

  // Convert to CSV
  const worksheet = XLSX.utils.aoa_to_sheet(csvData);
  const csv = XLSX.utils.sheet_to_csv(worksheet);

  // Create and download file
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
  const filename = `google_analytics_export_${dateStr}_${timeStr}_${timeRange}.csv`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, filename);
  
  return filename;
};

// Helper function to get readable time range label
function getTimeRangeLabel(timeRange) {
  const labels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days', 
    '90d': 'Last 90 days',
    '1y': 'Last year'
  };
  return labels[timeRange] || 'Custom range';
}