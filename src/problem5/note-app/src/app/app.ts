import { Component } from '@angular/core';
import {
    Router,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NavigationEnd,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
    templateUrl: './app.html',
    styleUrls: ['./app.css'],
})
export class App {
    showAuthLayout = true;

    constructor(private router: Router) {
        this.showAuthLayout = this.isAuthRoute(this.router.url);

        this.router.events
            .pipe(
                filter(
                    (event): event is NavigationEnd => event instanceof NavigationEnd,
                ),
            )
            .subscribe((event) => {
                this.showAuthLayout = this.isAuthRoute(
                    event.urlAfterRedirects,
                );
            });
    }

    private isAuthRoute(url: string) {
        return url.startsWith('/login') || url.startsWith('/signup');
    }
}
