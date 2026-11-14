# Free Medieval Village Tileset and Buildings

Assemble a compact village from six ground images, ten buildings, and a set of outdoor details. The selection emphasizes stone, timber, planted areas, and simple street furniture. Houses and work buildings share a small pixel treatment, while their native canvas sizes differ to accommodate roofs, towers, and wider facades.

This pack contains 35 assets: 6 tilesets, 10 buildings, 12 environment, 6 items, 1 furniture. There are 22 distinct native canvas sizes. The complete size histogram appears below and in manifest.json. All downloads in the archive are PNG; the WebP preview is a labeled visual index, not an asset atlas.

The ground files cover grass, dirt path, cobblestone, farmland, wooden floor, and water. Two cottages offer different roof colors and dimensions. A tavern, blacksmith, shop, church, windmill, stable, well, and market stall extend the settlement beyond housing. The bridge, fence, stone wall, oak, bush, hedge strip, flower bed, crop row, lamppost, haystack, campfire, and scarecrow are grouped as environment pieces. A barrel, crate, sign, cart, bucket, and flag are item images; the bench is the furniture member.

Use cobblestone for a center around the well and connect cottages with dirt paths or grass margins. Place the wider tavern or stable at the edge of an open area so its roof does not crowd the smaller houses. A market stall and cart can indicate a trade corner without needing an interior. Farmland and crop rows are separate images: place crops above the chosen ground layer and adjust spacing visually. The wooden floor is a texture option, not proof that building interiors or roof removal layers are included.

The 32×32 ground images can establish an initial map cell, while buildings should remain individual objects. The tavern is 64×56, one cottage is 44×44, and the church and windmill are 48×64. Those bounds are not multiples of a universal grid. Align foundations manually and define collision at ground level rather than around every roof pixel. The fence and hedge pieces may need custom end caps when joined into long runs; no connection metadata is shipped.

This revision has no human villagers, dialogue portraits, walk cycles, or interior furnishing set. The windmill is a single still image; its blades are not separate animated parts. The campfire is static too. The two cottages are retained because roof color and facade size offer distinct placement options. The existing village demo can illustrate composition, but the manifest is the authoritative download inventory. Review any texture seams and draw order in your own scene before building a large map, and keep a separate layer for signs and other narrow foreground props.

Each member record declares CC0. Under CC0, attribution is not required and commercial use and modification are allowed; retaining the included notice helps document where these files came from. This summarizes the catalog’s declaration, not an independent rights audit or a warranty about trademarks, publicity rights, or third-party material. README.md and LICENSE.txt accompany the image files.

Godot 4: import PNGs as textures and assign them to Sprite2D nodes. Choose Nearest filtering on CanvasItem for pixel art. Configure origins and placement for each file.

Unity: import each PNG as Sprite (2D and UI), with Sprite Mode Single. Use Point filtering for pixel art. Choose pixels per unit for your scene; the preview is not a sheet to slice.

GameMaker: import each unrelated image into its own sprite and set origins consistently. Disable texture interpolation for crisp pixel art. Multiple images in one sprite become subimages; this collection supplies no animation sequence.

Revision: 2026-10-12

Inventory and checksums: manifest.json. PNGs are native size; preview.webp is a labeled index, not a tilesheet.

1. village-grass-tile-32: 32x32, static
2. village-dirt-path-32: 32x32, static
3. village-cobblestone-32: 32x32, static
4. village-farmland-32: 32x32, static
5. village-wood-floor-32: 32x32, static
6. village-water-tile-32: 32x32, static
7. village-cottage-a: 48x48, static
8. village-cottage-b: 44x44, static
9. village-tavern: 64x56, static
10. village-blacksmith: 48x48, static
11. village-shop: 48x48, static
12. village-church: 48x64, static
13. village-windmill: 48x64, static
14. village-stable: 56x40, static
15. village-well-32: 32x36, static
16. village-bridge: 40x24, static
17. village-market-stall: 40x36, static
18. village-fence-section: 32x20, static
19. village-stone-wall: 32x16, static
20. village-oak-tree: 40x48, static
21. village-bush: 20x16, static
22. village-hedge-tile: 32x16, static
23. village-flower-bed: 32x16, static
24. village-crop-row: 32x16, static
25. village-barrel: 16x20, static
26. village-crate-32: 20x20, static
27. village-sign: 20x28, static
28. village-lamppost-32: 12x32, static
29. village-bench: 28x16, static
30. village-haystack: 24x20, static
31. village-cart: 40x24, static
32. village-bucket: 12x14, static
33. village-flag: 16x32, static
34. village-campfire: 20x16, static
35. village-scarecrow: 24x32, static
