import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-login-page',
    standalone: true,
    imports: [FormsModule, CommonModule, RouterLink, HttpClientModule],
    templateUrl: './login-page.html',
    styleUrls: ['./login-page.css'],
})
export class LoginPage {
    email = '';
    password = '';

    constructor(private http: HttpClient, private router: Router) {}

    login() {
        this.http
            .post('http://localhost:3000/users/login', {
                email: this.email,
                password: this.password,
            })
            .subscribe(
                (res: any) => {
                    localStorage.setItem('token', res.token);
                    this.router.navigate(['/home']);
                },
                (err) => {
                    console.error(err);
                    // Handle error (e.g., show an error message)
                }
            );
    }
}
