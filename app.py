from flask import Flask, render_template, request, redirect, url_for, session
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import base64
import uuid
from models import Colaborador

from models import Colaborador, EPI, Requisicao

app = Flask(__name__)
app.secret_key = 'segredo_top'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['UPLOAD_FOLDER'] = 'static/imagens/fotos_capturadas'

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB


db.init_app(app)

# ------------------- ROTAS PRINCIPAIS -------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/selecionar_epi')
def selecionar_epi():
    epis = EPI.query.all()
    return render_template('selecionar_epi.html', epis=epis)

@app.route('/faces-list')
def faces_list():
    import os
    folder = os.path.join('static', 'faces')
    arquivos = [f for f in os.listdir(folder) if f.endswith('.jpg')]
    return jsonify(arquivos)


@app.route('/biometria', methods=['POST'])
def biometria():
    session['epis'] = request.form.getlist('epis')
    return render_template('biometria.html')

@app.route('/confirmacao', methods=['POST'])
def confirmacao():
    imagem_base64 = request.form['imagem_base64'].split(',')[1]
    nome_arquivo = f"{uuid.uuid4().hex}.png"
    caminho = os.path.join(app.config['UPLOAD_FOLDER'], nome_arquivo)
    with open(caminho, 'wb') as f:
        f.write(base64.b64decode(imagem_base64))
    
    # Tentativa de reconhecimento: procura CPF baseado na imagem do rosto
    funcionarios = Funcionario.query.all()
    funcionario_identificado = funcionarios[0] if funcionarios else None

    if not funcionario_identificado:
        return "Funcionário não reconhecido. Cadastre primeiro.", 400

    session['funcionario_id'] = funcionario_identificado.id
    session['foto_requisicao'] = nome_arquivo

    return render_template('confirmacao.html', funcionario=funcionario_identificado)

@app.route('/requisitar', methods=['POST'])
def requisitar():
    funcionario = Funcionario.query.get(session.get('funcionario_id'))
    if not funcionario:
        return "Funcionário não encontrado", 404

    nova_requisicao = Requisicao(
        nome_funcionario=funcionario.nome,
        cpf_funcionario=funcionario.cpf,
        epis=", ".join(session.get('epis', [])),
        foto=session.get('foto_requisicao')
    )
    db.session.add(nova_requisicao)
    db.session.commit()

    return render_template('recibo.html', requisicao=nova_requisicao)

# ------------------- CADASTRO DE FUNCIONÁRIO -------------------

@app.route('/cadastrar_colaborador', methods=['GET', 'POST'])
def cadastrar_colaborador():
    if request.method == 'POST':
        nome = request.form['nome']
        funcao = request.form['funcao']
        cpf = request.form['cpf']
        foto = request.files['foto']

        # salva a foto com o nome do CPF
        if foto:
            filename = secure_filename(f"{cpf}.jpg")
            caminho_foto = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            foto.save(caminho_foto)

        novo = Colaborador(nome=nome, funcao=funcao, cpf=cpf, foto=caminho_foto)
        db.session.add(novo)
        db.session.commit()

        return redirect(url_for('cadastrar_colaborador'))

    return render_template('cadastrar_colaborador.html')


# ------------------- CADASTRO DE EPI -------------------

@app.route('/cadastro_epi', methods=['GET', 'POST'])
def cadastro_epi():
    if request.method == 'POST':
        nome = request.form['nome']
        ca = request.form['ca']
        novo_epi = EPI(nome=nome, ca=ca)
        db.session.add(novo_epi)
        db.session.commit()
        return redirect(url_for('index'))
    
    return render_template('cadastro_epi.html')

# ------------------- HISTÓRICO -------------------

@app.route('/historico')
def historico():
    cpf = request.args.get('cpf')
    if cpf:
        requisicoes = Requisicao.query.filter_by(cpf_funcionario=cpf).order_by(Requisicao.data.desc()).all()
    else:
        requisicoes = Requisicao.query.order_by(Requisicao.data.desc()).all()
    return render_template('historico.html', requisicoes=requisicoes)

# ------------------- BANCO -------------------

@app.before_first_request
def criar_banco():
    db.create_all()
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# ------------------- RENDER APP -------------------

if __name__ == '__main__':
    app.run(debug=True)
