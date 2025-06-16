# test

In this repo, we will be creating a tool named Object Regensis.

In Object Regensis, the whole project is broken down into multiple modules:
- Scanning the whole space
- Getting output of the whole space as a 3D model
- Object Detection
- Object Recognition
- Apply co-ordinate plane on the 3D model space
- Using the co-ordinate plane get the dimensions and place of the objects
- Take each object and break it down to the shapes of each object. Now we have the shape, position, dimension of any object to recreate it.

Now, using tools like CAD and Auto CAD regenerate the whole space, again.

## Plan and Suggested Tools

1. **Video capture** – record the environment with any camera. Use `ffmpeg` or `OpenCV` to extract frames.
2. **3D reconstruction** – run a structure-from-motion approach (e.g. COLMAP) on the frames to get a point cloud or mesh.
3. **Object detection** – apply models such as YOLO via PyTorch or OpenCV's DNN module to detect objects in the frames.
4. **Coordinate axes** – overlay axes on the frames or reconstructed model using OpenCV or Open3D. The included scripts `apply_axes.py` (image) and `apply_axes_video.py` (video) show how to draw axes.
5. **Dimension measurement** – after reconstruction, measure objects in the coordinate system. Open3D can compute bounding boxes.
6. **Shape breakdown** – fit simple primitives (cubes, spheres, cylinders) to each object mesh using tools like Blender or CGAL.
7. **CAD regeneration** – export the processed geometry to CAD software such as AutoCAD, Fusion 360, or FreeCAD for final modeling.

