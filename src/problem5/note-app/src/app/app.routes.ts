import { Routes } from '@angular/router';
import { HomePage } from './home-page/home-page';
import { LoginPage } from './login-page/login-page';
import { SignupPage } from './signup-page/signup-page';

export const routes: Routes = [
    { path: '', component: HomePage },
    { path: 'login', component: LoginPage },
    { path: 'signup', component: SignupPage },
    { path: '**', redirectTo: '' },
];
