import { Injectable } from '@angular/core';
import { Showcase } from './showcase.js';

/** A node of a tree: a type that refers to itself. */
export interface TreeNode {
    children: TreeNode[];
    parent?: TreeNode;
}

@Showcase({ title: 'Tree' })
@Injectable({ providedIn: 'root' })
export class TreeService {
    root(): TreeNode {
        return { children: [] };
    }
}
