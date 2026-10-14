# Bake Carriage/carriage.fbx + 马走DH.pc2 (3ds Max point cache, horse walk) into a slim, Y-up glTF.
# Texture colours are baked into vertex colours (the scene paints the rig in dots, so no maps ship),
# the coach is decimated ~93% (the driver kept as his own node), and one exact 32-frame stride of the cache becomes 16 morph keys on a
# decimated horse shared by both horse nodes. Then compress:
#   /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/bake-carriage.py -- /tmp/carriage-raw.glb
#   npx gltf-transform meshopt /tmp/carriage-raw.glb public/models/carriage.glb --level medium
import bpy, struct, sys, os, numpy as np, mathutils
SRC=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","Carriage")+"/"
OUT=sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=SRC+"carriage.fbx")
sc=bpy.context.scene; sc.frame_set(1)
dg=bpy.context.evaluated_depsgraph_get()
O=bpy.data.objects
imgcache={}
def img_px(img):
    if img.name not in imgcache:
        w,h=img.size
        a=np.array(img.pixels[:],dtype=np.float32).reshape(h,w,img.channels)[:,:,:3]
        imgcache[img.name]=a
    return imgcache[img.name]
def mat_source(m):
    if not m or not m.use_nodes: return ('col',(0.3,0.3,0.3))
    for n in m.node_tree.nodes:
        if n.type=='TEX_IMAGE' and n.image and n.image.size[0]>0: return ('img',n.image)
    for n in m.node_tree.nodes:
        if n.type=='BSDF_PRINCIPLED': return ('col',tuple(n.inputs['Base Color'].default_value)[:3])
    return ('col',tuple(m.diffuse_color)[:3])
def bake_colors(o):
    """per-corner colour from the texture (or the material colour), linear RGB"""
    me=o.data
    uv=me.uv_layers.active.data if me.uv_layers.active else None
    col=me.color_attributes.new('Bake','FLOAT_COLOR','CORNER')
    srcs=[mat_source(m) for m in me.materials]
    for p in me.polygons:
        kind,v=srcs[p.material_index] if srcs else ('col',(0.3,0.3,0.3))
        for li in p.loop_indices:
            if kind=='img' and uv:
                a=img_px(v); h,w,_=a.shape; u,t=uv[li].uv
                c=a[int((t%1)*h)%h, int((u%1)*w)%w]
            else: c=v
            col.data[li].color=(c[0],c[1],c[2],1)
    me.color_attributes.active_color=col
def world_copy(o,name):
    """evaluated mesh in world space as a new object"""
    me=bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    me.transform(o.matrix_world)
    n=bpy.data.objects.new(name,me); sc.collection.objects.link(n); return n
def decimate(o,ratio):
    m=o.modifiers.new('d','DECIMATE'); m.ratio=ratio
    bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier='d')
def tris(o): return sum(len(p.vertices)-2 for p in o.data.polygons)

body=world_copy(O['马车01'],'body'); drv=world_copy(O['objMateria'],'driver')
wf=world_copy(O['Object1071'],'wheels_front'); wr=world_copy(O['Object28'],'wheels_rear')
for o in (body,drv,wf,wr): bake_colors(o)
# the FBX spins the wheels about an off-centre pivot; recentre each axle on its hub
def hub(o):
    v=np.array([x.co[:] for x in o.data.vertices]); c=(v.min(0)+v.max(0))/2; r=(v.max(0)[2]-v.min(0)[2])/2
    return mathutils.Vector(c),r
(cf,rf),(cr,rr)=hub(wf),hub(wr)
ground=min(cf.z-rf,cr.z-rr)
print("hubs",cf,rf,cr,rr,"ground",ground)

# horse: one stride (32 frames, exact loop) from the point cache, forward travel removed
raw=open(SRC+"马走DH.pc2","rb").read()
N,=struct.unpack_from("<i",raw,16); NS,=struct.unpack_from("<i",raw,28)
pc=np.frombuffer(raw,dtype="<f4",offset=32).reshape(NS,N,3).astype(np.float64)
A=100; P=32; KEYS=16
stride=pc[A+P,:,1].mean()-pc[A,:,1].mean()
cyc=[pc[A+k].copy() for k in range(0,P,P//KEYS)]
home=pc[A,:,1].mean()-pc[0,:,1].mean()  # the cache walks off; bring the stride back to the rest pose
for i,f in enumerate(cyc): f[:,1]-=home+stride*(i*(P//KEYS))/P
h2=O['HORSE002']; M2=h2.matrix_world.copy(); M1=O['HORSE001'].matrix_world.copy()
print("stride local",stride,"world",abs(stride)*M2.to_scale()[0])
# decimate a copy of the horse, then let each kept vertex follow its nearest source vertex
hd=bpy.data.objects.new('hd',h2.data.copy()); sc.collection.objects.link(hd)
for v,p in zip(hd.data.vertices,cyc[0]): v.co=p
decimate(hd,0.4)
kd=mathutils.kdtree.KDTree(N)
for i,p in enumerate(cyc[0]): kd.insert(p,i)
kd.balance()
src=[kd.find(v.co)[1] for v in hd.data.vertices]
hd.data.materials.clear()
hc=hd.data.color_attributes.new('Bake','FLOAT_COLOR','CORNER')
for d in hc.data: d.color=(0.13,0.075,0.04,1)  # a bay: the FBX horse material is a flat colour
for v,s in zip(hd.data.vertices,src): v.co=cyc[0][s]
hd.shape_key_add(name='Basis')
for k,f in enumerate(cyc):
    sk=hd.shape_key_add(name=f'k{k:02d}')
    for i,s in enumerate(src): sk.data[i].co=f[s]
hd.data.name='horse'

# carriage frame: origin on the ground under the middle of the whole rig, facing -X (horses ahead)
allv=np.vstack([np.array([(o.matrix_world@x.co)[:] for x in o.data.vertices]) for o in (body,O['HORSE002'],O['HORSE001'])])
C=mathutils.Vector(((allv[:,0].min()+allv[:,0].max())/2,0,ground))
T=mathutils.Matrix.Translation(-C)
for o in (body,drv): o.data.transform(T)
for o,c in ((wf,cf),(wr,cr)):
    o.data.transform(mathutils.Matrix.Translation(-c)); o.location=c-C
# turn the rig so the horses lead along +X in three.js (Blender -X → rotate 180° about Z)
R=mathutils.Matrix.Rotation(np.pi,4,'Z')
root=bpy.data.objects.new('carriage',None); sc.collection.objects.link(root); root.matrix_world=R
for o in (body,drv,wf,wr): o.parent=root
hr=bpy.data.objects.new('horse_r',hd.data); hl=bpy.data.objects.new('horse_l',hd.data)
for o,M in ((hr,M2),(hl,M1)):
    sc.collection.objects.link(o); o.parent=root; o.matrix_parent_inverse.identity(); o.matrix_basis=T@M
bpy.data.objects.remove(hd)
for o,r in ((body,0.07),(drv,0.3),(wf,0.15),(wr,0.15)):
    o.data.materials.clear(); decimate(o,r)
for o in (body,drv,wf,wr,hr):
    ca=o.data.color_attributes; ca.active_color=ca['Bake']; ca.render_color_index=ca.find('Bake'); ca.active_color_index=ca.find('Bake')
for o in (body,drv,wf,wr,hr): print(o.name,"tris",tris(o),"verts",len(o.data.vertices))
for o in list(O):
    if o.name not in ('carriage','body','driver','wheels_front','wheels_rear','horse_r','horse_l'): bpy.data.objects.remove(o)
root['wheelRadius']=[rf,rr]; root['strideMetres']=abs(stride)*M2.to_scale()[0]; root['strideSeconds']=P/25
bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',export_extras=True,export_morph=True,export_morph_normal=False,
  export_normals=False,export_texcoords=False,export_materials='NONE',export_vertex_color='ACTIVE',export_all_vertex_colors=False,export_animations=False,export_apply=False)
