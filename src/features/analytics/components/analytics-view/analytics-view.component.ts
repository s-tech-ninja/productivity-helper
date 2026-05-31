import { Component, inject, effect, ElementRef, ViewChild, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardAnalyticsService } from '@/src/features/analytics/services/analytics.service';
import { IconComponent } from '../../../../shared/components/icons/icon.component';

declare var Chart: any;

@Component({
  selector: 'app-analytics-view',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './analytics-view.component.html'
})
export class AnalyticsViewComponent implements OnDestroy {
  analytics = inject(DashboardAnalyticsService);
  
  @ViewChild('velocityChart') velocityChartRef!: ElementRef;
  @ViewChild('focusChart') focusChartRef!: ElementRef;
  @ViewChild('accuracyChart') accuracyChartRef!: ElementRef;
  @ViewChild('energyChart') energyChartRef!: ElementRef;
  @ViewChild('projectChart') projectChartRef!: ElementRef;

  charts: any[] = [];
  private readonly STORAGE_KEY = 'analytics_view_prefs';
  
  // Toggles for visibility configuration
  showVelocity = signal(true);
  showAccuracy = signal(true);
  showDistribution = signal(true);

  // Computed value for template to avoid arrow function
  totalCompletedVelocity = computed(() => {
    const metrics = this.analytics.velocityMetrics();
    return (metrics || []).reduce((acc, v) => acc + (v.completed || 0), 0);
  });
  
  // Formatting Helper for Template
  formattedTotalTime = computed(() => {
    const metrics = this.analytics.focusMetrics();
    const mins = metrics?.totalMinutes || 0;
    if (mins === 0) return '0h';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  });

  constructor() {
    this.loadPrefs();

    // Persist preferences whenever they change
    effect(() => {
        const prefs = {
            showVelocity: this.showVelocity(),
            showAccuracy: this.showAccuracy(),
            showDistribution: this.showDistribution(),
            range: this.analytics.range()
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    });

    // Re-render charts when data OR visibility changes
    effect(() => {
       // Dependency Tracking: Read the signals to ensure effect re-runs when they change
       const v = this.analytics.velocityMetrics();
       const f = this.analytics.focusMetrics();
       const a = this.analytics.accuracyMetrics();
       const e = this.analytics.energyDistribution();
       const p = this.analytics.projectAllocation();
       
       const sv = this.showVelocity();
       const sa = this.showAccuracy();
       const sd = this.showDistribution();
       const range = this.analytics.range(); // Track range change too

       // Debounce slightly to allow DOM to update (especially @if blocks)
       setTimeout(() => {
         this.destroyCharts();
         this.initCharts(v, f, a, e, p);
       }, 50);
    });
  }

  loadPrefs() {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if(stored) {
          try {
              const prefs = JSON.parse(stored);
              if(prefs.showVelocity !== undefined) this.showVelocity.set(prefs.showVelocity);
              if(prefs.showAccuracy !== undefined) this.showAccuracy.set(prefs.showAccuracy);
              if(prefs.showDistribution !== undefined) this.showDistribution.set(prefs.showDistribution);
              if(prefs.range) this.analytics.range.set(prefs.range);
          } catch(e) {
              console.error('Failed to load analytics prefs', e);
          }
      }
  }

  setRange(range: 'daily' | 'weekly' | 'monthly' | 'all') {
    this.analytics.range.set(range);
  }

  // Toggle methods for template
  toggleVelocity() {
    this.showVelocity.update(v => !v);
  }

  toggleAccuracy() {
    this.showAccuracy.update(v => !v);
  }

  toggleDistribution() {
    this.showDistribution.update(v => !v);
  }

  ngOnDestroy() {
    this.destroyCharts();
  }

  destroyCharts() {
    this.charts.forEach(c => {
        if(c) c.destroy();
    });
    this.charts = [];
  }

  initCharts(velocity: any[], focus: any, accuracy: any[], energy: any, projects: any[]) {
    if (typeof Chart === 'undefined') return;

    // Common Options
    const darkScale = { 
       grid: { color: 'rgba(148, 163, 184, 0.1)' },
       ticks: { color: 'rgba(148, 163, 184, 0.8)' }
    };
    
    // Improved Tooltip Configuration
    const tooltipOptions = {
      backgroundColor: '#1e293b', // Slate 850
      titleColor: '#f8fafc', // Slate 50
      bodyColor: '#e2e8f0', // Slate 200
      borderColor: '#334155', // Slate 700
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      titleFont: { family: 'Inter', size: 13, weight: '600' },
      bodyFont: { family: 'Inter', size: 12 },
      callbacks: {
          label: function(context: any) {
             let label = context.dataset.label || '';
             
             // For Pie/Doughnut charts, use the data label (slice name) instead of dataset label
             if (context.chart.config.type === 'pie' || context.chart.config.type === 'doughnut') {
                 label = context.label || '';
             }

             if (label) {
                 label += ': ';
             }
             
             // Use formattedValue if available (handles all chart types), fallback to raw
             if (context.formattedValue !== undefined) {
                 label += context.formattedValue;
             } else {
                 label += context.raw;
             }
             return label;
          }
      }
    };
    
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                position: 'bottom',
                labels: { color: '#64748b', font: { family: 'Inter' } } 
            },
            tooltip: tooltipOptions
        },
        scales: {
            x: darkScale,
            y: darkScale
        }
    };

    // 1. Velocity Chart (Line)
    if (this.velocityChartRef && this.showVelocity() && velocity) {
      try {
        const existing = Chart.getChart(this.velocityChartRef.nativeElement);
        if(existing) existing.destroy();

        this.charts.push(new Chart(this.velocityChartRef.nativeElement, {
          type: 'line',
          data: {
            labels: velocity.map(d => d.label),
            datasets: [
              {
                label: 'Created',
                data: velocity.map(d => d.created || 0),
                borderColor: '#6366f1', // Indigo
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointBackgroundColor: '#6366f1'
              },
              {
                label: 'Completed',
                data: velocity.map(d => d.completed || 0),
                borderColor: '#10b981', // Emerald
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointBackgroundColor: '#10b981'
              }
            ]
          },
          options: chartOptions
        }));
      } catch (e) {
        console.error('Error rendering Velocity Chart:', e);
      }
    }

    // 2. Focus Gauge (Doughnut as Gauge)
    if (this.focusChartRef && focus) {
      const existing = Chart.getChart(this.focusChartRef.nativeElement);
      if(existing) existing.destroy();

      const score = parseFloat(focus.avgFocusScore || '0');
      const remainder = 5 - score;
      this.charts.push(new Chart(this.focusChartRef.nativeElement, {
        type: 'doughnut',
        data: {
          labels: ['Avg Score', 'Potential'],
          datasets: [{
            data: [score, remainder],
            backgroundColor: ['#f59e0b', '#e2e8f0'], // Amber, Slate-200
            borderWidth: 0,
            circumference: 180,
            rotation: 270
          }]
        },
        options: {
            ...chartOptions,
            scales: {}, // No scales for doughnut
            cutout: '75%',
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: false } // No tooltip for simple gauge
            }
        }
      }));
    }

    // 3. Accuracy Chart (Bar)
    if (this.accuracyChartRef && this.showAccuracy() && accuracy) {
      try {
        const existing = Chart.getChart(this.accuracyChartRef.nativeElement);
        if(existing) existing.destroy();

        this.charts.push(new Chart(this.accuracyChartRef.nativeElement, {
          type: 'bar',
          data: {
            labels: accuracy.map(d => (d.title || 'Task').length > 12 ? (d.title || 'Task').substring(0, 12) + '...' : (d.title || 'Task')),
            datasets: [
              {
                label: 'Estimated (m)',
                data: accuracy.map(d => Number(d.estimated || 0)),
                backgroundColor: '#94a3b8',
                borderRadius: 4,
              },
              {
                label: 'Actual (m)',
                data: accuracy.map(d => Number(d.actual || 0)),
                backgroundColor: accuracy.map(d => Number(d.actual || 0) > Number(d.estimated || 0) ? '#f43f5e' : '#10b981'), // Red if over, Green if under
                borderRadius: 4,
              }
            ]
          },
          options: {
            ...chartOptions,
            scales: {
              x: { ...darkScale, stacked: false },
              y: { ...darkScale, stacked: false }
            },
            interaction: {
              mode: 'index',
              intersect: false
            }
          }
        }));
      } catch (e) {
        console.error('Error rendering Accuracy Chart:', e);
      }
    }

    // 4. Energy (Pie)
    if (this.energyChartRef && this.showDistribution() && energy) {
      try {
        const existing = Chart.getChart(this.energyChartRef.nativeElement);
        if(existing) existing.destroy();

        this.charts.push(new Chart(this.energyChartRef.nativeElement, {
          type: 'doughnut',
          data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
              data: [energy.high || 0, energy.medium || 0, energy.low || 0],
              backgroundColor: ['#f43f5e', '#3b82f6', '#94a3b8'], // Rose, Blue, Slate
              borderWidth: 0
            }]
          },
          options: {
              ...chartOptions,
              scales: {},
              cutout: '60%',
              plugins: {
                  ...chartOptions.plugins,
                  legend: { position: 'right', labels: { usePointStyle: true, color: '#64748b' } }
              }
          }
        }));
      } catch (e) {
        console.error('Error rendering Energy Chart:', e);
      }
    }

    // 5. Project Allocation (Pie)
    if (this.projectChartRef && this.showDistribution() && projects) {
      try {
        const existing = Chart.getChart(this.projectChartRef.nativeElement);
        if(existing) existing.destroy();

        const safeProjects = projects || [];
        this.charts.push(new Chart(this.projectChartRef.nativeElement, {
          type: 'pie',
          data: {
            labels: safeProjects.slice(0, 5).map(p => p.project || 'Unknown'),
            datasets: [{
              data: safeProjects.slice(0, 5).map(p => p.minutes || 0),
              backgroundColor: ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'],
              borderWidth: 0
            }]
          },
          options: {
              ...chartOptions,
              scales: {},
              plugins: {
                  ...chartOptions.plugins,
                  legend: { position: 'right', labels: { usePointStyle: true, color: '#64748b', font: { size: 10 } } }
              }
          }
        }));
      } catch (e) {
        console.error('Error rendering Project Chart:', e);
      }
    }
  }
}
