import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

import { NotePage } from './note-page';

describe('NotePage', () => {
    let component: NotePage;
    let fixture: ComponentFixture<NotePage>;
    let httpTestingController: HttpTestingController;

    beforeEach(async () => {
        localStorage.setItem('token', 'test-token');

        await TestBed.configureTestingModule({
            imports: [
                NotePage,
                HttpClientTestingModule,
                RouterTestingModule.withRoutes([]),
            ],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({ id: 'note-1' }),
                        },
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(NotePage);
        component = fixture.componentInstance;
        httpTestingController = TestBed.inject(HttpTestingController);
        fixture.detectChanges();
    });

    afterEach(() => {
        httpTestingController.verify();
    });

    it('should create', () => {
        const req = httpTestingController.expectOne('http://localhost:3000/notes/note-1');
        req.flush({
            id: 'note-1',
            title: 'Note 1',
            ownerId: 'owner',
            updatedAt: new Date().toISOString(),
            lastVersion: 1,
            isPublic: false,
            accessRole: 'owner',
            content: '# Hello',
        });

        fixture.detectChanges();
        expect(component).toBeTruthy();
    });
});
