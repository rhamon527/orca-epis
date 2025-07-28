from flask import Flask, render_template, request, redirect, url_for, flash, session
from models import db, Funcionario, EPI, Requisicao, registrar_requisicao
import os
import face_recognition
import base64
import uuid
import pandas as pd
from datetime import datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = 'chave-secreta'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['UPLOAD_FOLDER'] = 'static/fotos_funcionarios'

db.init_app(app)
with app.app_context():
    db.create_all()

# ============ PROTEÇÃO DE ROTA ============
def login_obrigatorio(f):
    @wraps(f)
    def decorada(*args, **kwargs):
        if not session.get('admin_logado'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorada

# ============ LOGIN ============
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        usuario = request.form['usuario']
        senha = request.form['senha']
        if usuario == 'admin' and senha == '1234':
            session['admin_logado'] = True
            return redirect(url_for('index'))
        else:
            flash('Usuário ou senha inválidos')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))

# ============ PÁGINAS PRINCIPAIS ============
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/selecionar_epi', methods=['GET'])
def selecionar_epi():
    epis = EPI.query.all()
    return render_template('selecionar_epi.html', epis=epis)

@app.route('/captura')
def captura():
    return render_template('captura.html')

@app.route('/confirmacao', methods=['POST'])
def confirmacao():
    imagem_base64 = request.form['imagem_base64']
    if not imagem_base64:
        return "Imagem não recebida"

    imagem_bytes = base64.b64decode(imagem_base64.split(',')[1])
    nome_arquivo = f"static/fotos_requisicoes/{uuid.uuid4().hex}.jpg"
    with open(nome_arquivo, 'wb') as f:
        f.write(imagem_bytes)

    imagem_capturada = face_recognition.load_image_file(nome_arquivo)
    cod_capturada = face_recognition.face_encodings(imagem_capturada)

    if not cod_capturada:
        return "Rosto não detectado. Tente novamente."

    cod_capturada = cod_capturada[0]
    funcionarios = Funcionario.query.all()
    for func in funcionarios:
        caminho = os.path.join(app.config['UPLOAD_FOLDER'], func.imagem)
        if not os.path.exists(caminho): continue
        imagem_func = face_recognition.load_image_file(caminho)
        cod_func = face_recognition.face_encodings(imagem_func)
        if not cod_func: continue
        cod_func = cod_func[0]

        match = face_recognition.compare_faces([cod_func], cod_capturada)[0]
        if match:
            epis = request.args.getlist('epis')
            session['funcionario'] = {'nome': func.nome, 'cpf': func.cpf}
            session['epis'] = epis
            session['foto'] = nome_arquivo
            return render_template('confirmacao.html', nome=func.nome, cpf=func.cpf, epis=epis)

    return "Colaborador não reconhecido. Tente novamente."

@app.route('/recibo', methods=['POST'])
def recibo():
    dados = session.get('funcionario')
    epis = session.get('epis')
    foto = session.get('foto')
    data_hora = datetime.now().strftime('%d/%m/%Y %H:%M:%S')

    if dados and epis and foto:
        nova_req = Requisicao(
            nome_funcionario=dados['nome'],
            cpf_funcionario=dados['cpf'],
            epis=','.join(epis),
            data=data_hora,
            foto_reconhecimento=foto
        )
        db.session.add(nova_req)
        db.session.commit()

    return render_template('recibo.html', nome=dados['nome'], cpf=dados['cpf'], epis=epis, foto=foto, data=data_hora)

# ============ HISTÓRICO ============
@app.route('/historico', methods=['GET'])
def historico():
    cpf_busca = request.args.get('cpf')
    if cpf_busca:
        registros = Requisicao.query.filter_by(cpf_funcionario=cpf_busca).order_by(Requisicao.id.desc()).all()
    else:
        registros = Requisicao.query.order_by(Requisicao.id.desc()).all()
    return render_template('historico.html', registros=registros)

# ============ RELATÓRIO EXCEL ============
@app.route('/relatorio_excel', methods=['GET', 'POST'])
@login_obrigatorio
def relatorio_excel():
    if request.method == 'POST':
        mes = request.form['mes']
        ano = request.form['ano']
        registros = Requisicao.query.all()
        dados_filtrados = []

        for r in registros:
            try:
                data_req = datetime.strptime(r.data, '%d/%m/%Y %H:%M:%S')
                if data_req.month == int(mes) and data_req.year == int(ano):
                    dados_filtrados.append({
                        'Nome': r.nome_funcionario,
                        'CPF': r.cpf_funcionario,
                        'EPIs': r.epis,
                        'Data': r.data,
                        'Foto': r.foto_reconhecimento
                    })
            except:
                continue

        if not dados_filtrados:
            flash("Nenhum dado encontrado para esse mês.")
            return redirect(url_for('relatorio_excel'))

        df = pd.DataFrame(dados_filtrados)
        caminho = 'static/relatorio.xlsx'
        df.to_excel(caminho, index=False)

        return redirect(url_for('static', filename='relatorio.xlsx'))

    return render_template('relatorio_excel.html')

# ============ AVISO DE EPI VENCIDO ============
@app.route('/avisos')
@login_obrigatorio
def avisos():
    hoje = datetime.today().date()
    epis = EPI.query.filter(EPI.validade != None).all()
    vencidos = [e for e in epis if e.validade < hoje]
    return render_template('avisos.html', vencidos=vencidos)

# ============ CADASTROS (PROTEGIDOS) ============
@app.route('/cadastro_funcionarios', methods=['GET', 'POST'])
@login_obrigatorio
def cadastro_funcionarios():
    if request.method == 'POST':
        nome = request.form['nome']
        cpf = request.form['cpf']
        base64_str = request.form['foto']  # vem do input hidden
        if not base64_str:
            flash('Foto não capturada.')
            return redirect(url_for('cadastro_funcionarios'))

        imagem_bytes = base64.b64decode(base64_str.split(',')[1])
        nome_arquivo = f"{cpf}_{uuid.uuid4().hex}.jpg"
        caminho = os.path.join(app.config['UPLOAD_FOLDER'], nome_arquivo)

        with open(caminho, 'wb') as f:
            f.write(imagem_bytes)

        novo = Funcionario(nome=nome, cpf=cpf, imagem=nome_arquivo)
        db.session.add(novo)
        db.session.commit()
        flash('Funcionário cadastrado com sucesso!')

    return render_template('cadastro_funcionarios.html')

@app.route('/cadastro_epis', methods=['GET', 'POST'])
@login_obrigatorio
def cadastro_epis():
    if request.method == 'POST':
        nome = request.form['nome']
        ca = request.form['ca']
        validade = request.form.get('validade')
        nova_val = datetime.strptime(validade, '%Y-%m-%d').date() if validade else None

        novo = EPI(nome=nome, ca=ca, validade=nova_val)
        db.session.add(novo)
        db.session.commit()
        flash('EPI cadastrado!')
    return render_template('cadastro_epis.html')

# ============ RUN ============
if __name__ == '__main__':
    app.run(debug=True)
