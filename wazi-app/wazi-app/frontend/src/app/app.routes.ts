import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'listing/:id',
    loadComponent: () => import('./pages/listing-detail/listing-detail.component').then((m) => m.ListingDetailComponent),
  },
  {
    path: 'auth',
    loadComponent: () => import('./pages/auth/auth.component').then((m) => m.AuthComponent),
  },
  {
    path: 'owner',
    loadComponent: () => import('./pages/owner-dashboard/owner-dashboard.component').then((m) => m.OwnerDashboardComponent),
  },
  {
    path: 'owner/add',
    loadComponent: () => import('./pages/add-listing/add-listing.component').then((m) => m.AddListingComponent),
  },
  {
    path: 'tenant',
    loadComponent: () => import('./pages/tenant-dashboard/tenant-dashboard.component').then((m) => m.TenantDashboardComponent),
  },
  { path: '**', redirectTo: '' },
];
