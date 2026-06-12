import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('../features/tasks/components/dashboard-view/dashboard-view.component').then(m => m.DashboardViewComponent),
    data: { view: 'dashboard' }
  },
  {
    path: 'tasks',
    loadComponent: () => import('../features/tasks/components/dashboard-view/dashboard-view.component').then(m => m.DashboardViewComponent),
    data: { view: 'tasks' }
  },
  {
    path: 'tasks-not-completed',
    loadComponent: () => import('../features/tasks/components/dashboard-view/dashboard-view.component').then(m => m.DashboardViewComponent),
    data: { view: 'tasks-not-completed' }
  },
  {
    path: 'tasks-completed',
    loadComponent: () => import('../features/tasks/components/dashboard-view/dashboard-view.component').then(m => m.DashboardViewComponent),
    data: { view: 'tasks-completed' }
  },
  {
    path: 'history',
    loadComponent: () => import('../features/tasks/components/dashboard-view/dashboard-view.component').then(m => m.DashboardViewComponent),
    data: { view: 'history' }
  },
  {
    path: 'tasks-all',
    loadComponent: () => import('../features/tasks/components/task-list-view/task-list-view.component').then(m => m.TaskListViewComponent)
  },
  {
    path: 'ai-features',
    loadComponent: () => import('../features/planning-ai/components/planning-ai-view/ai-features-view.component').then(m => m.AiFeaturesViewComponent)
  },
  {
    path: 'analytics',
    loadComponent: () => import('../features/analytics/components/analytics-view/analytics-view.component').then(m => m.AnalyticsViewComponent)
  },
  {
    path: 'diary',
    loadComponent: () => import('../features/diary/components/diary-view/diary-view.component').then(m => m.DiaryViewComponent)
  },
  {
    path: 'calendar',
    loadComponent: () => import('../features/scheduler/components/calendar-view/calendar-view.component').then(m => m.CalendarViewComponent)
  },
  {
    path: 'project-analysis',
    loadComponent: () => import('../features/projects/components/project-analysis/project-analysis-view.component').then(m => m.ProjectAnalysisViewComponent)
  },
  {
    path: 'project-view',
    loadComponent: () => import('../features/projects/components/project-view/project-view.component').then(m => m.ProjectViewComponent)
  },
  {
    path: 'project-list',
    loadComponent: () => import('../features/projects/components/project-list/project-list.component').then(m => m.ProjectListComponent)
  }
];