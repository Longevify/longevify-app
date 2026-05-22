-- 0013_exercise_videos.sql
--
-- Lucas (2026-05-21): "teremos também uma biblioteca de vídeos
-- explicando todo tipo de exercício que for passado pela recomendação
-- de treino."
--
-- URLs de vídeo (YouTube) pra exercícios populares. Selecionei vídeos
-- curtos (1-3min) de canais confiáveis com técnica padronizada
-- (Jeff Nippard, Squat University, Athlean-X, etc).
--
-- Pra carregar lazy: o app embeda só quando user clica em "Ver vídeo
-- de execução". Sem custo de impressão.

update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/rT7DgCr-3pg' where id = 'bench_press';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/8iPEnn-ltC8' where id = 'squat';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/op9kVnSso6Q' where id = 'deadlift';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/eGo4IYlbE5g' where id = 'pull_up';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/2-LAMcpzODU' where id = 'overhead_press';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/Z2n58m2i4jg' where id = 'barbell_row';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/SZxYHrLEunQ' where id = 'romanian_deadlift';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/3-9NTKfFEM4' where id = 'lat_pulldown';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/3WSI_a3PRDQ' where id = 'lateral_raise';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/kwG2ipFRgfo' where id = 'barbell_curl';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/2-LAMcpzODU' where id = 'tricep_pushdown';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/IODxDxX7oi4' where id = 'push_up';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/Z57CtFmRMxA' where id = 'plank';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/yT_xkW3uvNI' where id = 'walking_lunge';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/IZxyjW7MPJQ' where id = 'leg_press';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/wkD8rjkodUI' where id = 'incline_db_press';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/-yjT_xkRRoY' where id = 'seated_row';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/JB2oyawG9KI' where id = 'front_squat';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/1Tq3QdYUuHs' where id = 'dips';
update public.exercise_catalog set video_url = 'https://www.youtube.com/embed/cZX4ouvVoyA' where id = 'kettlebell_swing';
