import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-page.html',
  styleUrls: ['./home-page.css']
})
export class HomePage {
  insights = [
    { label: 'Notes captured', value: '128', detail: 'Across 8 shared spaces' },
    { label: 'Secure sync', value: 'Always on', detail: 'Encrypted in transit & at rest' },
    { label: 'Fast search', value: '0.3s', detail: 'Average time to find a thought' }
  ];

  highlights = [
    {
      title: 'Instant capture',
      copy: 'Start a note, record a voice snippet, or clip a web idea without leaving the keyboard.'
    },
    {
      title: 'Organize confidently',
      copy: 'Folders, tags, and pins keep priorities visible so context never slips away.'
    },
    {
      title: 'Share when ready',
      copy: 'Invite collaborators, control permissions, and watch updates land in real time.'
    }
  ];
}
