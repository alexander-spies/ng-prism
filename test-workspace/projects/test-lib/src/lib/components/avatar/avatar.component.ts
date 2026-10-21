import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';
import { Showcase } from '@ng-prism/core';

/** Diameter of an avatar: `sm` 28px, `md` 36px, `lg` 48px. */
export type AvatarSizeType = 'sm' | 'md' | 'lg';

/**
 * Round picture of a person, with two fallbacks for when there is no photo.
 *
 * ## What it shows
 *
 * 1. The image from `src`, cropped to a circle
 * 2. Without `src`: the initials of `name`, the first letters of its first two words
 * 3. Without either: a neutral person icon
 *
 * `name` is also the image's `alt` text, so set it even when you pass a photo.
 *
 * @since 1.0.0
 * @see AvatarSizeType
 * @example
 * ```html
 * <sg-avatar name="Jane Smith" size="lg" />
 * ```
 * @example
 * ```html
 * <sg-avatar src="/assets/users/42.jpg" name="Jane Smith" />
 * ```
 */
@Showcase({
    title: 'Avatar',
    status: 'stable',
    category: 'Data Display',
    description: 'User avatar with image source, initials fallback, and size variants.',
    variants: [
        { name: 'Initials Small', inputs: { name: 'John Doe', size: 'sm' } },
        { name: 'Initials Medium', inputs: { name: 'Jane Smith', size: 'md' } },
        { name: 'Initials Large', inputs: { name: 'Alex P.', size: 'lg' } },
        { name: 'Placeholder', inputs: { size: 'md' } }
    ],
    tags: ['display', 'avatar', 'user', 'profile']
})
@Component({
    selector: 'sg-avatar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'sg-avatar',
        '[attr.data-size]': 'size()'
    },
    template: `
        @if (src()) {
            <img class="sg-avatar__img" [src]="src()" [alt]="name() || 'Avatar'" />
        } @else if (initials()) {
            <span class="sg-avatar__initials">{{ initials() }}</span>
        } @else {
            <svg class="sg-avatar__placeholder" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
        }
    `,
    styles: `
        .sg-avatar {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #e5e7eb;
            color: #6b7280;
            overflow: hidden;
            flex-shrink: 0;
        }
        .sg-avatar[data-size='sm'] {
            width: 28px;
            height: 28px;
            font-size: 11px;
        }
        .sg-avatar[data-size='md'] {
            width: 36px;
            height: 36px;
            font-size: 13px;
        }
        .sg-avatar[data-size='lg'] {
            width: 48px;
            height: 48px;
            font-size: 16px;
        }
        .sg-avatar__img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .sg-avatar__initials {
            font-weight: 600;
            text-transform: uppercase;
            color: #4b5563;
        }
        .sg-avatar__placeholder {
            width: 60%;
            height: 60%;
            color: #9ca3af;
        }
    `
})
export class AvatarComponent {
    /** URL of the photo. When empty, the avatar falls back to the initials or the placeholder icon. */
    readonly src = input<string>('');

    /** Full name of the person: the source of the initials and the image's `alt` text. */
    readonly name = input<string>('');

    /** Diameter of the avatar, see `AvatarSizeType`. */
    readonly size = input<AvatarSizeType>('md');

    protected readonly initials = computed(() => {
        const n = this.name();

        if (!n) return '';
        return n
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2);
    });

    /** Returns the initials shown for `name`: at most two letters, empty without a name. */
    getInitials(): string {
        return this.initials();
    }
}
