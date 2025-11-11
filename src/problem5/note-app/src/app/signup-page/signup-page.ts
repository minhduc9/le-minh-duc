import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-signup-page',
    standalone: true,
    imports: [FormsModule, CommonModule, RouterLink, HttpClientModule],
    templateUrl: './signup-page.html',
    styleUrls: ['./signup-page.css'],
})
export class SignupPage {
    name = '';
    email = '';
    password = '';

    constructor(private http: HttpClient, private router: Router) {}

    signup() {
        this.http
            .post('http://localhost:3000/users/signup', {
                name: this.name,
                email: this.email,
                password: this.password,
            })
            .subscribe(
                () => {
                    this.router.navigate(['/login']);
                },
                (err) => {
                    console.error(err);
                    // Handle error (e.g., show an error message)
                }
            );
    }
}
